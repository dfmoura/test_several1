import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as financeService from "../services/finance.service.js";

export async function financeRoutes(app: FastifyInstance) {
  app.get("/api/finance/receivables", async (request) => {
    const user = requireAuth(request);
    return financeService.listReceivables(user.orgId);
  });

  app.get("/api/finance/payables", async (request) => {
    const user = requireAuth(request);
    return financeService.listPayables(user.orgId);
  });

  app.post("/api/finance/payments", async (request) => {
    const user = requireAuth(request);
    return financeService.allocatePayment(
      user.orgId,
      request.body as Parameters<typeof financeService.allocatePayment>[1],
      user.sub,
    );
  });

  app.post("/api/finance/allocate", async (request) => {
    const user = requireAuth(request);
    const body = request.body as Parameters<typeof financeService.allocatePayment>[1] & {
      amountCents?: number;
    };
    const amount =
      body.amount ??
      (body.amountCents != null ? Number(body.amountCents) / 100 : undefined);
    await financeService.allocatePayment(
      user.orgId,
      { ...body, amount: amount as number },
      user.sub,
    );
    return { ok: true };
  });
}
