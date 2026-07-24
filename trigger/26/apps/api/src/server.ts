import cors from "@fastify/cors";
import Fastify from "fastify";
import { pool } from "./db/pool.js";
import { AppError } from "./lib/errors.js";
import { env } from "./lib/env.js";
import { authHook } from "./plugins/auth.js";
import { registerCorrelation } from "./plugins/correlation.js";
import { registerRoutes } from "./routes/index.js";
import { closeRedis } from "./routes/health.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.appEnv === "local" ? "info" : "warn" },
  });

  await app.register(cors, { origin: true });
  registerCorrelation(app);
  app.addHook("onRequest", authHook);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        requestId: request.requestId,
      });
    }
    request.log.error(error);
    return reply.status(500).send({
      error: "Erro interno do servidor.",
      requestId: request.requestId,
    });
  });

  await registerRoutes(app);
  return app;
}

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.port, host: "0.0.0.0" });
  app.log.info(`API listening on port ${env.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function shutdown() {
  await closeRedis();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
