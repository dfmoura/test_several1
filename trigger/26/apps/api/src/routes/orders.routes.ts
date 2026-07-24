import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as orderService from "../services/order.service.js";

export async function orderRoutes(app: FastifyInstance) {
  app.get("/api/orders", async (request) => {
    const user = requireAuth(request);
    return orderService.listOrders(user.orgId);
  });

  app.get("/api/orders/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return orderService.getOrder(id, user.orgId);
  });

  app.post("/api/orders", async (request) => {
    const user = requireAuth(request);
    const body = request.body as {
      quoteId: string;
      selectedQuantity?: number;
      paymentTerms?: string;
      expectedReceiptDate?: string;
      shippingAddressId?: string;
      billingAddressId?: string;
      notes?: string;
    };
    return orderService.createOrderFromQuote(user.orgId, body.quoteId, {
      paymentTerms: body.paymentTerms ?? "28",
      expectedReceiptDate: body.expectedReceiptDate,
      shippingAddressId: body.shippingAddressId,
      billingAddressId: body.billingAddressId,
      notes: body.notes,
      selectedQuantity: body.selectedQuantity,
    });
  });

  app.patch("/api/orders/:id/status", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const body = request.body as { status: string };
    return orderService.updateOrderStatus(id, user.orgId, body.status);
  });
}
