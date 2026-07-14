import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Redis } from 'ioredis';
import { loadConfig, createLogger, toProblemDetails } from '@nfse/shared';
import { createDb, NfseService, XmlStorage, IdempotencyStore, AuditLogger, AdminService, SettingsService, createCertificadoProvider, CadastroEnrichmentService, DfeRecebidasService, resolveEmitente, TomadorCadastroService } from '@nfse/application';
import { createSefinGateway, createCadastroGateway } from '@nfse/gov-client';
import { registerNfseRoutes } from './routes/nfse.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAdminRoutes } from './routes/admin.js';
import { authMiddleware } from './middleware/auth.js';

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger('nfse-api', config.logLevel);

  const app = Fastify({
    logger: false,
    requestIdHeader: 'x-correlation-id',
    genReqId: (req) => (req.headers['x-correlation-id'] as string) ?? crypto.randomUUID(),
  });

  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  const db = createDb(config.databaseUrl);
  let redis: Redis | undefined;
  try {
    redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
  } catch {
    logger.warn('Redis indisponível — idempotência via PostgreSQL apenas');
    redis = undefined;
  }

  const certificado = createCertificadoProvider(config);
  const cadastro = createCadastroGateway(config.cadastroCacheTtlSec);
  const audit = new AuditLogger(db);
  const settingsService = new SettingsService(db, config, audit);
  await settingsService.getRow();
  const enrichment = new CadastroEnrichmentService(cadastro, () => settingsService.isCadastroEnabledSync());
  const sefin = createSefinGateway(config.ambiente, config.govMock, certificado.getHttpsAgent(), cadastro);
  const storage = new XmlStorage(config);
  const idempotency = new IdempotencyStore(db, redis);
  const nfseService = new NfseService(db, sefin, storage, idempotency, audit, config, certificado, enrichment, settingsService);
  const adminService = new AdminService(db, config, settingsService);
  const dfeRecebidasService = new DfeRecebidasService(
    db,
    storage,
    config,
    () => resolveEmitente(config, certificado.validade()).cnpj,
  );
  const tomadorCadastroService = new TomadorCadastroService(db, audit);

  app.decorate('nfseService', nfseService);
  app.decorate('adminService', adminService);
  app.decorate('settingsService', settingsService);
  app.decorate('dfeRecebidasService', dfeRecebidasService);
  app.decorate('tomadorCadastroService', tomadorCadastroService);
  app.decorate('config', config);
  app.decorate('enrichment', enrichment);

  app.addHook('preHandler', authMiddleware);

  app.setErrorHandler((error, request, reply) => {
    const problem = toProblemDetails(error, request.url);
    logger.error({ err: error, problem, traceId: request.id }, 'request error');
    reply.status(problem.status).send(problem);
  });

  await registerHealthRoutes(app, db, nfseService);
  await registerNfseRoutes(app);
  await registerAdminRoutes(app);

  const port = config.apiPort;
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port, ambiente: config.ambiente }, 'nfse-api started');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

declare module 'fastify' {
  interface FastifyInstance {
    nfseService: NfseService;
    adminService: AdminService;
    settingsService: SettingsService;
    dfeRecebidasService: DfeRecebidasService;
    tomadorCadastroService: TomadorCadastroService;
    config: ReturnType<typeof loadConfig>;
    enrichment: CadastroEnrichmentService;
  }
}
