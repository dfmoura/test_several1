import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as catalogService from "../services/catalog.service.js";

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/api/catalog/items", async (request) => {
    const user = requireAuth(request);
    return catalogService.listItems(user.orgId);
  });

  app.get("/api/catalog/machines", async (request) => {
    const user = requireAuth(request);
    return catalogService.listMachines(user.orgId);
  });

  app.get("/api/catalog/dies", async (request) => {
    const user = requireAuth(request);
    return catalogService.listDies(user.orgId);
  });
}
