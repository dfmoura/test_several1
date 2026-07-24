import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import { badRequest } from "../lib/errors.js";
import * as billingService from "../services/billing.service.js";

export async function billingRoutes(app: FastifyInstance) {
  app.get("/api/billing/invoices", async (request) => {
    const user = requireAuth(request);
    return billingService.listInvoices(user.orgId);
  });

  app.get("/api/billing/billable-orders", async (request) => {
    const user = requireAuth(request);
    return billingService.listBillableOrders(user.orgId);
  });

  app.get("/api/billing/invoices/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return billingService.getInvoice(id, user.orgId);
  });

  app.post("/api/billing/invoices", async (request) => {
    const user = requireAuth(request);
    const body = request.body as {
      salesOrderId?: string;
      orderId?: string;
      managerOverride?: boolean;
    };
    const salesOrderId = body.salesOrderId ?? body.orderId;
    if (!salesOrderId) throw badRequest("salesOrderId é obrigatório.");
    return billingService.createInvoice(user.orgId, salesOrderId, {
      managerOverride: body.managerOverride ?? true,
      userRoles: user.roles,
    });
  });

  app.post("/api/billing/invoices/:id/nfe", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return billingService.emitNfe(id, user.orgId);
  });

  app.post("/api/billing/invoices/:id/charge", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { dueDate?: string };
    return billingService.emitCharge(id, user.orgId, body.dueDate);
  });
}
