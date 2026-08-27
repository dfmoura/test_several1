import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { Redis } from 'ioredis';
import { loadConfig, createLogger, toProblemDetails } from '@nfe/shared';
import {
  createDb,
  NfeService,
  XmlStorage,
  IdempotencyStore,
  AuditLogger,
  AdminService,
  EmitenteService,
  DestinatarioService,
  ProdutoService,
} from '@nfe/application';
import { registerNfeRoutes } from './routes/nfe.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerCadastroRoutes } from './routes/cadastro.js';
import { registerConsultaRoutes } from './routes/consulta.js';
import { authMiddleware } from './middleware/auth.js';

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger('nfe-api', config.logLevel);

  const app = Fastify({
    logger: false,
    requestIdHeader: 'x-correlation-id',
    genReqId: (req) => (req.headers['x-correlation-id'] as string) ?? crypto.randomUUID(),
  });

  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

  const db = createDb(config.databaseUrl);
  let redis: Redis | undefined;
  try {
    redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
  } catch {
    logger.warn('Redis indisponível — idempotência via PostgreSQL apenas');
    redis = undefined;
  }

  const audit = new AuditLogger(db);
  const storage = new XmlStorage(config);
  const idempotency = new IdempotencyStore(db, redis);
  const emitenteService = new EmitenteService(db, storage, audit, config);
  const nfeService = new NfeService(db, storage, idempotency, audit, emitenteService, config);
  const adminService = new AdminService(db, config);
  const destinatarioService = new DestinatarioService(db, audit);
  const produtoService = new ProdutoService(db, audit);

  app.decorate('nfeService', nfeService);
  app.decorate('emitenteService', emitenteService);
  app.decorate('adminService', adminService);
  app.decorate('destinatarioService', destinatarioService);
  app.decorate('produtoService', produtoService);
  app.decorate('config', config);

  app.addHook('preHandler', authMiddleware);

  app.setErrorHandler((error, request, reply) => {
    const problem = toProblemDetails(error, request.url);
    logger.error({ err: error, problem, traceId: request.id }, 'request error');
    reply.status(problem.status).send(problem);
  });

  await registerHealthRoutes(app, db);
  await registerNfeRoutes(app);
  await registerCadastroRoutes(app);
  await registerConsultaRoutes(app);
  await registerAdminRoutes(app);

  const port = config.apiPort;
  await app.listen({ port, host: '0.0.0.0' });
  logger.info({ port, ambiente: config.ambiente, mock: config.sefazMock }, 'nfe-api started');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

declare module 'fastify' {
  interface FastifyInstance {
    nfeService: NfeService;
    emitenteService: EmitenteService;
    adminService: AdminService;
    destinatarioService: DestinatarioService;
    produtoService: ProdutoService;
    config: ReturnType<typeof loadConfig>;
  }
}
