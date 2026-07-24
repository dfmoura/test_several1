import type { QuoteSpec } from "@reta/domain";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as pricingService from "../services/pricing.service.js";

export async function pricingRoutes(app: FastifyInstance) {
  app.get("/api/pricing/tables", async (request) => {
    const user = requireAuth(request);
    return pricingService.getTablesSummary(user.orgId);
  });

  app.post("/api/pricing/calculate", async (request) => {
    const user = requireAuth(request);
    const body = request.body as { spec: QuoteSpec; quantities: number[] };
    const tiers = await pricingService.calculatePricing(
      body.spec,
      body.quantities,
      user.orgId,
    );
    return { tiers };
  });
}
