import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import { checkDb } from "../db/pool.js";
import { env } from "../lib/env.js";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  return redis;
}

async function checkRedis(): Promise<boolean> {
  try {
    const r = getRedis();
    if (r.status !== "ready") await r.connect();
    const pong = await r.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", env: env.appEnv }));

  app.get("/ready", async (_req, reply) => {
    const [dbOk, redisOk] = await Promise.all([checkDb(), checkRedis()]);
    if (!dbOk || !redisOk) {
      return reply.status(503).send({
        status: "not_ready",
        checks: { database: dbOk, redis: redisOk },
      });
    }
    return { status: "ready", checks: { database: true, redis: true } };
  });
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
