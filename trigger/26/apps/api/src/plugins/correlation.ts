import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

export function registerCorrelation(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    const incoming = request.headers["x-request-id"];
    const requestId = typeof incoming === "string" && incoming ? incoming : randomUUID();
    request.requestId = requestId;
    reply.header("x-request-id", requestId);
  });
}
