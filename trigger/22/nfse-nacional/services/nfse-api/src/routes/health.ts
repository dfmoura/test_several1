import type { FastifyInstance } from 'fastify';
import type { NfseService } from '@nfse/application';
import type { Database } from '@nfse/application';
import { sql } from 'drizzle-orm';

export async function registerHealthRoutes(
  app: FastifyInstance,
  db: Database,
  nfseService: NfseService,
) {
  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/health/ready', async (_req, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      const cert = nfseService.certificadoInfo();
      const degraded = !cert.mock && cert.diasParaExpirar < 1;
      return reply.status(degraded ? 503 : 200).send({
        status: degraded ? 'degraded' : 'ok',
        database: 'connected',
        certificado: {
          mock: cert.mock,
          cnpj: cert.cnpj,
          subject: cert.subject,
          clientAuth: cert.clientAuth,
          diasParaExpirar: cert.diasParaExpirar,
          validade: cert.validade.toISOString(),
        },
      });
    } catch (err) {
      return reply.status(503).send({
        status: 'degraded',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  });

  app.get('/health/gov', async () => ({
    status: 'skipped',
    message: 'Ping gov.br desabilitado por padrão',
  }));
}
