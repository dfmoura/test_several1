import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { NfseService } from './nfse-service.js';
import type { SyncService } from './sync.js';
import type { Auth } from './auth.js';
import type { Config } from './config.js';
import { ambienteLabel } from './config.js';
import { toProblemDetails } from '@nfse/shared';
import type { EmitirNfseInput } from '@nfse/domain';

declare module 'fastify' {
  interface FastifyInstance {
    nfse: NfseService;
    sync: SyncService;
    auth: Auth;
    config: Config;
  }
}

function requireAuth(auth: Auth) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies[auth.COOKIE_NAME];
    if (!auth.verifySession(token)) {
      return reply.status(401).send({ error: 'Não autenticado' });
    }
  };
}

export async function registerRoutes(app: FastifyInstance) {
  const { nfse, sync, auth, config } = app;
  const guard = requireAuth(auth);

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.post('/api/auth/login', async (request, reply) => {
    const body = request.body as { password?: string };
    if (!body?.password || !auth.login(body.password)) {
      return reply.status(401).send({ error: 'Senha incorreta' });
    }
    reply.setCookie(auth.COOKIE_NAME, auth.signSession(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });
    return { ok: true };
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(auth.COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', { preHandler: guard }, async () => ({ ok: true }));

  app.get('/api/status', { preHandler: guard }, async () => {
    const status = nfse.status();
    return {
      ...status,
      ambienteLabel: ambienteLabel(config.ambiente),
    };
  });

  app.post('/api/nfse/emitir', { preHandler: guard }, async (request) => {
    const body = request.body as EmitirNfseInput;
    return nfse.emitir(body);
  });

  app.get('/api/nfse/emitidas', { preHandler: guard }, async (request) => {
    const q = request.query as { limit?: string; offset?: string };
    return nfse.listarEmitidas(
      q.limit ? parseInt(q.limit, 10) : 50,
      q.offset ? parseInt(q.offset, 10) : 0,
    );
  });

  app.get('/api/nfse/emitidas/:chave', { preHandler: guard }, async (request) => {
    const { chave } = request.params as { chave: string };
    return nfse.consultarEmitida(chave);
  });

  app.get('/api/nfse/emitidas/:chave/xml', { preHandler: guard }, async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const xml = nfse.getXmlEmitida(chave);
    reply.header('Content-Type', 'application/xml');
    reply.header('Content-Disposition', `attachment; filename="${chave}.xml"`);
    return xml;
  });

  app.get('/api/nfse/emitidas/:chave/pdf', { preHandler: guard }, async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const pdf = await nfse.getPdf(chave);
    if (!pdf) {
      return reply.status(404).send({ error: 'PDF não disponível' });
    }
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${chave}.pdf"`);
    return pdf;
  });

  app.post('/api/nfse/emitidas/:chave/cancelar', { preHandler: guard }, async (request) => {
    const { chave } = request.params as { chave: string };
    const body = request.body as { codigoMotivo?: string; motivo?: string };
    return nfse.cancelar({
      chaveAcesso: chave,
      codigoMotivo: body.codigoMotivo ?? '1',
      motivo: body.motivo ?? 'Cancelamento solicitado pelo emitente',
    });
  });

  app.get('/api/nfse/recebidas', { preHandler: guard }, async (request) => {
    const q = request.query as { limit?: string; offset?: string };
    return nfse.listarRecebidas(
      q.limit ? parseInt(q.limit, 10) : 50,
      q.offset ? parseInt(q.offset, 10) : 0,
    );
  });

  app.get('/api/nfse/recebidas/:chave/xml', { preHandler: guard }, async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const xml = nfse.getXmlRecebida(chave);
    reply.header('Content-Type', 'application/xml');
    reply.header('Content-Disposition', `attachment; filename="${chave}.xml"`);
    return xml;
  });

  app.post('/api/sync', { preHandler: guard }, async () => {
    return sync.sincronizar();
  });

  app.setErrorHandler((error, request, reply) => {
    const problem = toProblemDetails(error, request.url);
    reply.status(problem.status).send(problem);
  });
}
