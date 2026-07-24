import type { FastifyInstance } from "fastify";
import * as webhookService from "../services/webhook.service.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/api/webhooks/inter", async (request) => {
    return webhookService.handleInterWebhook(request.body as Parameters<typeof webhookService.handleInterWebhook>[0]);
  });
}
