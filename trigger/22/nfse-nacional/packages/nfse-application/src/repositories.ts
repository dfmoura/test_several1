import { eq } from 'drizzle-orm';
import type { Database } from './db/index.js';
import { schema } from './db/index.js';

type RedisClient = import('ioredis').default;

export class IdempotencyStore {
  constructor(
    private readonly db: Database,
    private readonly redis?: RedisClient,
  ) {}

  async get(key: string): Promise<unknown | null> {
    if (this.redis) {
      const cached = await this.redis.get(`idempotency:${key}`);
      if (cached) return JSON.parse(cached);
    }

    const rows = await this.db
      .select()
      .from(schema.idempotency)
      .where(eq(schema.idempotency.key, key))
      .limit(1);

    const row = rows[0];
    if (!row || row.expiresAt < new Date()) return null;
    return row.response;
  }

  async set(key: string, response: unknown, ttlSeconds = 86400): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.db
      .insert(schema.idempotency)
      .values({ key, response, expiresAt })
      .onConflictDoUpdate({
        target: schema.idempotency.key,
        set: { response, expiresAt },
      });

    if (this.redis) {
      await this.redis.setex(`idempotency:${key}`, ttlSeconds, JSON.stringify(response));
    }
  }
}

export class AuditLogger {
  constructor(private readonly db: Database) {}

  async log(params: {
    action: string;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    ip?: string;
  }): Promise<void> {
    await this.db.insert(schema.auditLog).values({
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata,
      ip: params.ip,
    });
  }
}

export class NsuControleRepository {
  constructor(private readonly db: Database) {}

  async getUltimoNsu(): Promise<string> {
    const rows = await this.db.select().from(schema.nsuControle).where(eq(schema.nsuControle.id, 1)).limit(1);
    if (rows.length === 0) {
      await this.db.insert(schema.nsuControle).values({ id: 1, ultimoNsu: '0' });
      return '0';
    }
    return rows[0]!.ultimoNsu;
  }

  async atualizar(ultimoNsu: string): Promise<void> {
    await this.db
      .insert(schema.nsuControle)
      .values({ id: 1, ultimoNsu })
      .onConflictDoUpdate({
        target: schema.nsuControle.id,
        set: { ultimoNsu, updatedAt: new Date() },
      });
  }
}
