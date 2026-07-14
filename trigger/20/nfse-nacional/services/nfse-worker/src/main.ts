import amqp from 'amqplib';
import { eq } from 'drizzle-orm';
import { loadConfig, createLogger } from '@nfse/shared';
import { createDb, schema } from '@nfse/application';

const QUEUES = ['nfse.emissao.retry', 'nfse.webhook.dispatch', 'nfse.sync.process'] as const;

async function processOutbox(db: ReturnType<typeof createDb>, channel: amqp.Channel, logger: ReturnType<typeof createLogger>) {
  const pending = await db
    .select()
    .from(schema.outbox)
    .where(eq(schema.outbox.published, false))
    .limit(50);

  for (const event of pending) {
    const queue = event.eventType.startsWith('dfe.')
      ? 'nfse.sync.process'
      : 'nfse.webhook.dispatch';

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
  const logger = createLogger('nfse-worker', config.logLevel);
  const db = createDb(config.databaseUrl);

  const conn = await amqp.connect(config.rabbitmqUrl);
  const channel = await conn.createChannel();

  for (const queue of QUEUES) {
    await channel.assertQueue(queue, { durable: true });
    await channel.assertQueue('nfse.dlq', { durable: true });

    channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString());
        logger.info({ queue, content }, 'message processed');
        channel.ack(msg);
      } catch (err) {
        logger.error({ err, queue }, 'message failed');
        channel.nack(msg, false, false);
        channel.sendToQueue('nfse.dlq', msg.content, { persistent: true });
      }
    });
  }

  logger.info('nfse-worker started');

  setInterval(() => {
    processOutbox(db, channel, logger).catch((err) => logger.error({ err }, 'outbox error'));
  }, 5000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
