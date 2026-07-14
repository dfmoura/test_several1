import { Redis } from 'ioredis';
import { loadConfig, createLogger } from '@nfse/shared';
import { createDb, SyncService, XmlStorage, createCertificadoProvider, resolveEmitente } from '@nfse/application';
import { createAdnGateway } from '@nfse/gov-client';

const LOCK_KEY = 'nfse:sync:leader';
const LOCK_TTL = 120;

async function acquireLock(redis: Redis): Promise<boolean> {
  const result = await redis.set(LOCK_KEY, process.pid.toString(), 'EX', LOCK_TTL, 'NX');
  return result === 'OK';
}

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger('nfse-sync', config.logLevel);
  const db = createDb(config.databaseUrl);
  const certificado = createCertificadoProvider(config);
  const emitente = resolveEmitente(config, certificado.validade());
  const adn = createAdnGateway(config.ambiente, config.govMock, certificado.getHttpsAgent(), emitente.cnpj);
  const storage = new XmlStorage(config);
  const sync = new SyncService(db, adn, storage, config);

  let redis: Redis | undefined;
  try {
    redis = new Redis(config.redisUrl);
  } catch {
    logger.warn('Redis indisponível — sync sem leader election');
  }

  async function runSync() {
    if (redis) {
      const acquired = await acquireLock(redis);
      if (!acquired) {
        logger.debug('outro sync é leader, pulando ciclo');
        return;
      }
    }

    try {
      const result = await sync.sincronizarDfe();
      logger.info(result, 'sync ADN concluído');
    } catch (err) {
      logger.error({ err }, 'sync ADN falhou');
    }
  }

  logger.info({ intervalSec: config.syncIntervalSec }, 'nfse-sync started');
  await runSync();
  setInterval(runSync, config.syncIntervalSec * 1000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
