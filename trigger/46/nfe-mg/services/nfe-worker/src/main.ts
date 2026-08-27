import amqp from 'amqplib';
import { eq } from 'drizzle-orm';
import { loadConfig, createLogger } from '@nfe/shared';
import {
  createDb,
  schema,
  XmlStorage,
  IdempotencyStore,
  AuditLogger,
  EmitenteService,
  NfeService,
} from '@nfe/application';

const QUEUES = ['nfe.autorizacao.poll', 'nfe.webhook.dispatch'] as const;

async function processOutbox(
  db: ReturnType<typeof createDb>,
  channel: amqp.Channel,
  logger: ReturnType<typeof createLogger>,
) {
  const pending = await db
    .select()
    .from(schema.outbox)
    .where(eq(schema.outbox.published, false))
    .limit(50);

  for (const event of pending) {
    const queue = event.eventType.includes('processando')
      ? 'nfe.autorizacao.poll'
      : 'nfe.webhook.dispatch';

    channel.sendToQueue(queue, Buffer.from(JSON.stringify({
      type: event.eventType,
      payload: event.payload,
      id: event.id,
    })), { persistent: true });

    await db.update(schema.outbox)
      .set({ published: true })
      .where(eq(schema.outbox.id, event.id));

    logger.info({ eventType: event.eventType, id: event.id }, 'outbox published');
  }
}

async function bootstrap() {
  const config = loadConfig();
  const logger = createLogger('nfe-worker', config.logLevel);
  const db = createDb(config.databaseUrl);
  const audit = new AuditLogger(db);
  const storage = new XmlStorage(config);
  const emitentes = new EmitenteService(db, storage, audit, config);
  const nfeService = new NfeService(db, storage, new IdempotencyStore(db), audit, emitentes, config);

  const conn = await amqp.connect(config.rabbitmqUrl);
  const channel = await conn.createChannel();

  for (const queue of QUEUES) {
    await channel.assertQueue(queue, { durable: true });
    await channel.assertQueue('nfe.dlq', { durable: true });

    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString());
        logger.info({ queue, content }, 'message processed');
        channel.ack(msg);
      } catch (err) {
        logger.error({ err, queue }, 'message failed');
        channel.nack(msg, false, false);
        channel.sendToQueue('nfe.dlq', msg.content, { persistent: true });
      }
    });
  }

  logger.info('nfe-worker started');

  setInterval(() => {
    processOutbox(db, channel, logger).catch((err) => logger.error({ err }, 'outbox error'));
  }, 5000);

  setInterval(() => {
    nfeService.processarRecibosPendentes().then((n) => {
      if (n > 0) logger.info({ n }, 'recibos processados');
    }).catch((err) => logger.error({ err }, 'poll recibo error'));
  }, 8000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
