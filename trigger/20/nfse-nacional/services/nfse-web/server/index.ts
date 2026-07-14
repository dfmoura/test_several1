import { createHmac, timingSafeEqual } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.NFSE_WEB_PORT ?? 3002);
const API_URL = process.env.NFSE_API_URL ?? 'http://localhost:18100';
const API_KEY = process.env.NFSE_API_KEY ?? 'dev-api-key-change-in-production';
const WEB_PASSWORD = process.env.NFSE_WEB_PASSWORD ?? 'admin';
const SESSION_SECRET = process.env.NFSE_WEB_SESSION_SECRET ?? process.env.NFSE_JWT_SECRET ?? 'dev-session-secret';
const COOKIE_NAME = 'nfse_console_session';
const IS_PROD = process.env.NODE_ENV === 'production';

function signSession(): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ exp, role: 'admin' });
  const sig = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (sig.length !== expected.length) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const data = JSON.parse(payload) as { exp: number };
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

async function proxyToApi(
  path: string,
  init: RequestInit & { rawBody?: string },
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-API-Key', API_KEY);
  if (init.rawBody !== undefined) {
    return fetch(`${API_URL}${path}`, { ...init, headers, body: init.rawBody });
  }
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

async function bootstrap() {
  const app = Fastify({ logger: !IS_PROD });

  await app.register(cookie);

  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { password?: string };
    if (!body?.password) {
      return reply.status(401).send({ error: 'Senha inválida' });
    }

    let authenticated = body.password === WEB_PASSWORD;
    try {
      const response = await proxyToApi('/v1/admin/console-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        rawBody: JSON.stringify({ password: body.password }),
      });
      if (response.ok) {
        const result = (await response.json()) as { ok?: boolean };
        authenticated = Boolean(result.ok);
      }
    } catch {
      // Fallback para senha local (.env) se API indisponível
    }

    if (!authenticated) {
      return reply.status(401).send({ error: 'Senha inválida' });
    }
    const token = signSession();
    reply.setCookie(COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      maxAge: 86400,
    });
    return { ok: true };
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (request, reply) => {
    const token = request.cookies[COOKIE_NAME];
    if (!verifySession(token)) {
      return reply.status(401).send({ authenticated: false });
    }
    return { authenticated: true };
  });

  app.all('/api/*', async (request, reply) => {
    const token = request.cookies[COOKIE_NAME];
    if (!verifySession(token)) {
      return reply.status(401).send({ error: 'Não autenticado' });
    }

    const apiPath = request.url.replace(/^\/api/, '');
    const method = request.method;
    const query = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
    const targetPath = `${apiPath.split('?')[0]}${query}`;

    const headers: Record<string, string> = {};
    const contentType = request.headers['content-type'];
    if (contentType) headers['Content-Type'] = contentType;
    const idempotency = request.headers['x-idempotency-key'];
    if (idempotency) headers['X-Idempotency-Key'] = String(idempotency);

    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {});
    }

    const response = await proxyToApi(targetPath, { method, headers, rawBody: body });
    const resContentType = response.headers.get('content-type') ?? 'application/json';
    reply.status(response.status);
    reply.header('Content-Type', resContentType);

    if (resContentType.includes('application/json')) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return reply.send(buffer);
  });

  if (IS_PROD) {
    const distPath = join(__dirname, '..', '..', 'dist');
    await app.register(fastifyStatic, { root: distPath, prefix: '/' });
    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html', distPath);
    });
  }

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`nfse-web BFF listening on :${PORT}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
