import Fastify from 'fastify';
import { loadConfig, createLogger } from '@nfe/shared';
import {
  createDb,
  NfeService,
  XmlStorage,
  IdempotencyStore,
  AuditLogger,
  EmitenteService,
} from '@nfe/application';
import { parseNfeXml } from '@nfe/xml';
import { renderDanfe } from './danfe-renderer.js';

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger('nfe-danfe', config.logLevel);
  const db = createDb(config.databaseUrl);
  const audit = new AuditLogger(db);
  const storage = new XmlStorage(config);
  const emitentes = new EmitenteService(db, storage, audit, config);
  const nfeService = new NfeService(db, storage, new IdempotencyStore(db), audit, emitentes, config);

  const app = Fastify({ logger: false });

  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/danfe/:chave', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const cachedKey = storage.buildNfeKey(chave, 'danfe');
    const cached = await storage.getPdf(cachedKey);
    if (cached) {
      reply.header('Content-Type', 'application/pdf');
      return reply.send(cached);
    }

    const nfe = await nfeService.consultar(chave);
    const xml = await nfeService.getXml(chave);
    const parsed = parseNfeXml(xml, chave);
    const pdf = await renderDanfe(parsed, nfe.situacao);
    try {
      await storage.putPdf(cachedKey, pdf);
    } catch {
      // cache opcional
    }
    reply.header('Content-Type', 'application/pdf');
    return reply.send(pdf);
  });

  await app.listen({ port: 3001, host: '0.0.0.0' });
  logger.info('nfe-danfe started on :3001');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
