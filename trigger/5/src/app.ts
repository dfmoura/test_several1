import Fastify from "fastify";
import { env } from "./config/env.js";
import { registerCreditLinesRoutes } from "./routes/creditLines.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  app.get("/", async () => ({
    service: "open-finance-credit-lines",
    description: "Consulta de linhas de crédito (Open Finance — Empréstimos)",
    endpoints: {
      health: { method: "GET", path: "/health" },
      creditLines: { method: "POST", path: "/credit-lines" },
    },
  }));

  app.get("/health", async () => ({ status: "ok" }));

  await registerCreditLinesRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled error");
    if (reply.sent) return;
    reply.status(500).send({
      error: "InternalServerError",
      message: env.NODE_ENV === "development" ? error.message : "Erro interno",
    });
  });

  return app;
}
