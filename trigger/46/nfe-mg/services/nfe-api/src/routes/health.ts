import type { FastifyInstance } from 'fastify';
import type { Database } from '@nfe/application';
import { sql } from 'drizzle-orm';

export async function registerHealthRoutes(app: FastifyInstance, db: Database) {
  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/health/ready', async (_req, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      const emitentes = await app.emitenteService.listar();
      const certs = emitentes.map((e) => ({
        id: e.id,
        apelido: e.apelido,
        alerta: e.certificado.alerta,
        diasParaExpirar: e.certificado.diasParaExpirar,
      }));
      const expired = certs.some((c) => c.alerta === 'expirado');
      return reply.status(expired && !app.config.sefazMock ? 503 : 200).send({
        status: expired && !app.config.sefazMock ? 'degraded' : 'ok',
        database: 'connected',
        sefazMock: app.config.sefazMock,
        ambiente: app.config.ambiente,
        certificados: certs,
      });
    } catch (err) {
      return reply.status(503).send({
        status: 'degraded',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  });

  app.get('/health/sefaz', async () => ({
    status: 'skipped',
    message: 'Use POST /v1/emitentes/:id/status-servico',
  }));
}
