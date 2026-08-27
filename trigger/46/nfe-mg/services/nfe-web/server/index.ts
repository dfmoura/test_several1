import { createHmac, timingSafeEqual } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.NFE_WEB_PORT ?? 3002);
const API_URL = process.env.NFE_API_URL ?? 'http://localhost:19100';
const API_KEY = process.env.NFE_API_KEY ?? 'dev-api-key-change-in-production';
const WEB_PASSWORD = process.env.NFE_WEB_PASSWORD ?? 'admin';
const SESSION_SECRET = process.env.NFE_WEB_SESSION_SECRET ?? 'dev-session-secret-nfe-mg';
const COOKIE_NAME = 'nfe_console_session';
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

async function proxyToApi(path: string, init: RequestInit & { rawBody?: string | Uint8Array }): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-API-Key', API_KEY);
  return fetch(`${API_URL}${path}`, { ...init, headers, body: init.rawBody as RequestInit['body'] });
}

async function bootstrap() {
  const app = Fastify({ logger: !IS_PROD, bodyLimit: 8 * 1024 * 1024 });
  await app.register(cookie);

  app.addContentTypeParser('multipart/form-data', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { password?: string };
    if (!body?.password) return reply.status(401).send({ error: 'Senha inválida' });
    let authenticated = body.password === WEB_PASSWORD;
    try {
      const response = await proxyToApi('/v1/admin/console-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        rawBody: JSON.stringify({ password: body.password }),
      });
      if (response.ok) {
        const result = (await response.json()) as { ok?: boolean };
        if (result.ok) authenticated = true;
      }
    } catch {
      // fallback senha local
    }
    if (!authenticated) return reply.status(401).send({ error: 'Senha inválida' });
    reply.setCookie(COOKIE_NAME, signSession(), {
      path: '/', httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: 86400,
    });
    return { ok: true };
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (request, reply) => {
    if (!verifySession(request.cookies[COOKIE_NAME])) {
      return reply.status(401).send({ authenticated: false });
    }
    return { authenticated: true };
  });

  app.all('/api/*', async (request, reply) => {
    if (!verifySession(request.cookies[COOKIE_NAME])) {
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
    const emitente = request.headers['x-emitente-id'];
    if (emitente) headers['X-Emitente-Id'] = String(emitente);

    let body: string | Uint8Array | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      if (typeof request.body === 'string') body = request.body;
      else if (Buffer.isBuffer(request.body)) body = new Uint8Array(request.body);
      else body = JSON.stringify(request.body ?? {});
    }

    const response = await proxyToApi(targetPath, { method, headers, rawBody: body });
    const resContentType = response.headers.get('content-type') ?? 'application/json';
    reply.status(response.status);
    reply.header('Content-Type', resContentType);
    if (resContentType.includes('application/json')) {
      const text = await response.text();
      try { return JSON.parse(text); } catch { return text; }
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
  console.log(`nfe-web BFF listening on :${PORT}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
