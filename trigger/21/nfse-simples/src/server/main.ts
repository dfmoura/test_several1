import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { FileStorage } from './storage.js';
import { NfseService } from './nfse-service.js';
import { SyncService } from './sync.js';
import { createAuth } from './auth.js';
import { registerRoutes } from './routes.js';
import { createSefinGateway, createAdnGateway } from '@nfse/gov-client';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const config = loadConfig();
  const db = createDb(config);
  const storage = new FileStorage(config);

  const { CertificadoProvider } = await import('@nfse/xml');
  const certificado = CertificadoProvider.create({
    certPath: config.certPath,
    certPassword: config.certPassword,
    certPasswordFile: config.certPasswordFile,
    cnpj: config.cnpj,
    govMock: config.govMock,
    certRequired: config.certRequired,
  });

  const httpsAgent = certificado.getHttpsAgent();
  const sefin = createSefinGateway(config.ambiente, config.govMock, httpsAgent);
  const adn = createAdnGateway(config.ambiente, config.govMock, httpsAgent, config.cnpj);

  const nfseFull = new NfseService(db, sefin, adn, storage, config, certificado);
  const sync = new SyncService(db, adn, storage, config.govMock);
  const auth = createAuth(config.sessionSecret, config.webPassword);

  const app = Fastify({ logger: config.logLevel !== 'error' });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);

  app.decorate('nfse', nfseFull);
  app.decorate('sync', sync);
  app.decorate('auth', auth);
  app.decorate('config', config);

  await registerRoutes(app);

  const webDir = join(__dirname, '../web');
  if (existsSync(webDir)) {
    await app.register(fastifyStatic, {
      root: webDir,
      prefix: '/',
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Rota não encontrada' });
      }
      return reply.sendFile('index.html');
    });
  }

  if (!config.govMock && config.syncIntervalSec > 0) {
    setInterval(() => {
      sync.sincronizar().catch((err) => {
        app.log.error({ err }, 'Erro na sincronização ADN');
      });
    }, config.syncIntervalSec * 1000);
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`NFS-e Simples rodando em http://localhost:${config.port}`);
  console.log(`Ambiente: ${config.ambiente}${config.govMock ? ' (gov mock)' : ''}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
