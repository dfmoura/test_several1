import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as workOrderService from "../services/work-order.service.js";

export async function workOrderRoutes(app: FastifyInstance) {
  app.get("/api/work-orders", async (request) => {
    const user = requireAuth(request);
    return workOrderService.listWorkOrders(user.orgId);
  });

  app.get("/api/work-orders/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return workOrderService.getWorkOrder(id, user.orgId);
  });

  app.post("/api/work-orders", async (request) => {
    const user = requireAuth(request);
    const body = request.body as { salesOrderLineId: string; machineId?: string; dieId?: string; notes?: string };
    return workOrderService.createWorkOrder(user.orgId, body.salesOrderLineId, body);
  });

  app.post("/api/work-orders/:id/liberar", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return workOrderService.liberarWorkOrder(id, user.orgId);
  });

  app.post("/api/work-orders/:id/start", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return workOrderService.startWorkOrder(id, user.orgId);
  });

  app.post("/api/work-orders/:id/iniciar", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return workOrderService.startWorkOrder(id, user.orgId);
  });

  app.post("/api/work-orders/:id/complete", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return workOrderService.completeWorkOrder(id, user.orgId, user.sub);
  });

  app.post("/api/work-orders/:id/concluir", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return workOrderService.completeWorkOrder(id, user.orgId, user.sub);
  });
}
