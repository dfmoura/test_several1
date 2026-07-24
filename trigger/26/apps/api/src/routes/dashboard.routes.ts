import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as dashboardService from "../services/dashboard.service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (request) => {
    const user = requireAuth(request);
    return dashboardService.getDashboardCounts(user.orgId);
  });
}
