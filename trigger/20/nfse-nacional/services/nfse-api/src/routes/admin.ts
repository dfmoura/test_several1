import type { FastifyInstance } from 'fastify';
import { ValidationError } from '@nfse/shared';

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/v1/admin/dashboard', async () => app.adminService.dashboard());

  app.get('/v1/admin/audit', async (request) => {
    const q = request.query as { limit?: string; offset?: string };
    return app.adminService.listarAuditoria(
      q.limit ? parseInt(q.limit, 10) : 50,
      q.offset ? parseInt(q.offset, 10) : 0,
    );
  });

  app.get('/v1/admin/outbox', async (request) => {
    const q = request.query as { limit?: string; offset?: string; published?: string };
    const published =
      q.published === 'true' ? true : q.published === 'false' ? false : undefined;
    return app.adminService.listarOutbox(
      q.limit ? parseInt(q.limit, 10) : 50,
      q.offset ? parseInt(q.offset, 10) : 0,
      published,
    );
  });

  app.get('/v1/admin/dfe', async (request) => {
    const q = request.query as { limit?: string; offset?: string; processado?: string };
    const processado =
      q.processado === 'true' ? true : q.processado === 'false' ? false : undefined;
    return app.adminService.listarDfe(
      q.limit ? parseInt(q.limit, 10) : 50,
      q.offset ? parseInt(q.offset, 10) : 0,
      processado,
    );
  });

  app.get('/v1/admin/dps', async (request) => {
    const q = request.query as { limit?: string; offset?: string; status?: string };
    return app.adminService.listarDps(
      q.limit ? parseInt(q.limit, 10) : 50,
      q.offset ? parseInt(q.offset, 10) : 0,
      q.status,
    );
  });

  app.get('/v1/admin/nsu', async () => app.adminService.nsuStatus());

  app.get('/v1/admin/config', async () => {
    const emitente = await app.enrichment.enriquecerEmitente(app.nfseService.emitenteInfo());
    return app.adminService.configPublica(emitente);
  });

  app.get('/v1/admin/settings', async () => {
    const emitente = app.nfseService.emitenteInfo();
    return app.settingsService.buildView({
      cnpj: emitente.cnpj,
      certificadoAtivo: emitente.certificadoAtivo,
    });
  });

  app.patch('/v1/admin/settings', async (request) => {
    const body = request.body as Record<string, unknown>;
    const emitente = app.nfseService.emitenteInfo();
    await app.settingsService.update(body, request.ip);
    return app.settingsService.buildView({
      cnpj: emitente.cnpj,
      certificadoAtivo: emitente.certificadoAtivo,
    });
  });

  app.post('/v1/admin/settings/reset', async (request) => {
    const body = request.body as { field?: string };
    const allowed = [
      'inscricaoMunicipal',
      'codigoMunicipio',
      'dpsSerie',
      'razaoSocial',
      'syncIntervalSec',
      'cadastroEnabled',
      'cadastroCacheTtlSec',
      'logLevel',
    ] as const;
    if (!body.field || !allowed.includes(body.field as typeof allowed[number])) {
      throw new ValidationError('Campo inválido para reset');
    }
    await app.settingsService.resetField(body.field as typeof allowed[number], request.ip);
    const emitente = app.nfseService.emitenteInfo();
    return app.settingsService.buildView({
      cnpj: emitente.cnpj,
      certificadoAtivo: emitente.certificadoAtivo,
    });
  });

  app.post('/v1/admin/settings/console-password', async (request) => {
    const body = request.body as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword) {
      throw new ValidationError('Senha atual e nova senha são obrigatórias');
    }
    const envFallback = process.env.NFSE_WEB_PASSWORD ?? 'admin';
    await app.settingsService.updateConsolePassword(
      body.currentPassword,
      body.newPassword,
      envFallback,
      request.ip,
    );
    return { ok: true };
  });

  /** Verificação interna para o BFF autenticar o console. */
  app.post('/v1/admin/console-auth', async (request) => {
    const body = request.body as { password?: string };
    if (!body.password) return { ok: false };
    const envFallback = process.env.NFSE_WEB_PASSWORD ?? 'admin';
    const ok = await app.settingsService.verifyConsolePassword(body.password, envFallback);
    return { ok };
  });
}
