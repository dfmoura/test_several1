import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as shipmentService from "../services/shipment.service.js";

export async function shipmentRoutes(app: FastifyInstance) {
  app.get("/api/shipments", async (request) => {
    const user = requireAuth(request);
    return shipmentService.listShipments(user.orgId);
  });

  app.get("/api/shipments/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return shipmentService.getShipment(id, user.orgId);
  });

  app.post("/api/shipments", async (request) => {
    const user = requireAuth(request);
    const body = request.body as {
      salesOrderId?: string;
      orderId?: string;
      carrierName?: string;
      trackingCode?: string;
    };
    const salesOrderId = body.salesOrderId ?? body.orderId;
    if (!salesOrderId) throw new Error("salesOrderId é obrigatório.");
    return shipmentService.createShipment(user.orgId, salesOrderId, body);
  });

  app.patch("/api/shipments/:id/status", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const body = request.body as { status: string };
    return shipmentService.advanceShipmentStatus(id, user.orgId, body.status);
  });

  app.post("/api/shipments/:id/confirm", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Parameters<
      typeof shipmentService.confirmDelivery
    >[2];
    return shipmentService.confirmDelivery(id, user.orgId, body, user.sub);
  });

  app.post("/api/shipments/:id/confirm-delivery", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return shipmentService.confirmDelivery(id, user.orgId, request.body as Parameters<typeof shipmentService.confirmDelivery>[2], user.sub);
  });
}
