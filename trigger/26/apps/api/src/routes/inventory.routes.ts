import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as inventoryService from "../services/inventory.service.js";

export async function inventoryRoutes(app: FastifyInstance) {
  app.get("/api/inventory/balances", async (request) => {
    const user = requireAuth(request);
    const query = request.query as { warehouseId?: string };
    return inventoryService.listBalances(user.orgId, query.warehouseId);
  });

  app.get("/api/inventory/movements", async (request) => {
    const user = requireAuth(request);
    const query = request.query as { limit?: string };
    return inventoryService.listMovements(user.orgId, query.limit ? Number(query.limit) : 100);
  });
}
