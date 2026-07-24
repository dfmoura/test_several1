import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as purchasingService from "../services/purchasing.service.js";

export async function purchasingRoutes(app: FastifyInstance) {
  app.get("/api/purchasing/orders", async (request) => {
    const user = requireAuth(request);
    return purchasingService.listPurchaseOrders(user.orgId);
  });

  app.get("/api/purchasing/orders/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return purchasingService.getPurchaseOrder(id, user.orgId);
  });

  app.post("/api/purchasing/orders", async (request) => {
    const user = requireAuth(request);
    return purchasingService.createPurchaseOrder(user.orgId, request.body as Parameters<typeof purchasingService.createPurchaseOrder>[1]);
  });

  app.post("/api/purchasing/orders/:id/receive", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return purchasingService.receiveGoods(
      user.orgId,
      id,
      request.body as Parameters<typeof purchasingService.receiveGoods>[2],
      user.sub,
    );
  });
}
