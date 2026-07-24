import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import type { QuoteSpec } from "@reta/domain";
import * as quoteService from "../services/quote.service.js";

function normalizeCreateBody(body: Record<string, unknown>) {
  if (body.line) return body as Parameters<typeof quoteService.createQuote>[1];
  const spec = body.spec as QuoteSpec | undefined;
  if (!spec || !body.customerId) {
    return body as Parameters<typeof quoteService.createQuote>[1];
  }
  return {
    customerId: String(body.customerId),
    taxPercent: spec.taxPercent,
    commissionPercent: spec.commissionPercent,
    machineCostGroup: spec.machineCostGroup,
    usesMatrix: spec.usesMatrix,
    firstOrderMatrix: spec.firstOrderMatrix,
    notes: body.notes as string | undefined,
    quantities: body.quantities as number[] | undefined,
    line: {
      measureLabel: spec.measureLabel,
      paperWidthCm: spec.paperWidthCm,
      pullCm: spec.pullCm,
      colors: spec.colors,
      paperName: spec.paperName,
      finishName: spec.finishName,
      modelsQty: spec.modelsQty,
      columnsQty: spec.columnsQty,
      labelsPerRoll: spec.labelsPerRoll,
      tubeSize: spec.tubeSize,
      dieKind: spec.dieKind,
      repeatZ: spec.repeatZ,
      rewindColumns: spec.rewindColumns,
      changeoverMode: spec.changeoverMode,
      rpm: spec.rpm,
    },
  };
}

export async function quoteRoutes(app: FastifyInstance) {
  app.get("/api/quotes", async (request) => {
    const user = requireAuth(request);
    return quoteService.listQuotes(user.orgId);
  });

  app.get("/api/quotes/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return quoteService.getQuote(id, user.orgId);
  });

  app.post("/api/quotes", async (request) => {
    const user = requireAuth(request);
    const input = normalizeCreateBody((request.body ?? {}) as Record<string, unknown>);
    return quoteService.createQuote(user.orgId, input);
  });

  app.patch("/api/quotes/:id/status", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const body = request.body as { status: string; selectedQuantity?: number };
    if (body.status === "aprovado" || body.status === "aprovar") {
      return quoteService.approveQuote(id, user.orgId, body.selectedQuantity ?? 10000);
    }
    return quoteService.updateQuoteStatus(id, user.orgId, body.status);
  });

  app.post("/api/quotes/:id/approve", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const body = request.body as { selectedQuantity: number };
    return quoteService.approveQuote(id, user.orgId, body.selectedQuantity);
  });
}
