import type { FastifyInstance } from 'fastify';

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/v1/admin/dashboard', async (request) => {
    const emitenteId = request.headers['x-emitente-id'] as string | undefined;
    return app.adminService.dashboard(emitenteId);
  });

  app.get('/v1/admin/config', async () => app.adminService.configPublica());

  app.get('/v1/admin/audit', async (request) => {
    const q = request.query as { limit?: string; offset?: string };
    return app.adminService.audit(Number(q.limit ?? 50), Number(q.offset ?? 0));
  });

  app.get('/v1/admin/outbox', async (request) => {
    const q = request.query as { limit?: string; offset?: string; published?: string };
    const published = q.published === undefined ? undefined : q.published === 'true';
    return app.adminService.outbox(Number(q.limit ?? 50), Number(q.offset ?? 0), published);
  });

  app.get('/v1/admin/lotes', async (request) => {
    const q = request.query as { limit?: string; offset?: string };
    return app.adminService.lotes(Number(q.limit ?? 50), Number(q.offset ?? 0));
  });

  app.post('/v1/admin/console-auth', async (request) => {
    const body = request.body as { password?: string };
    if (!body?.password) return { ok: false };
    const dbAuth = await app.adminService.consoleAuth(body.password);
    if (dbAuth.ok) return { ok: true };
    return { ok: body.password === process.env.NFE_WEB_PASSWORD };
  });
}
