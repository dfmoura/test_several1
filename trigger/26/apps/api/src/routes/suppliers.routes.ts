import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as supplierService from "../services/supplier.service.js";

export async function supplierRoutes(app: FastifyInstance) {
  app.get("/api/suppliers", async (request) => {
    const user = requireAuth(request);
    return supplierService.listSuppliers(user.orgId);
  });

  app.post("/api/suppliers", async (request) => {
    const user = requireAuth(request);
    return supplierService.createSupplier(user.orgId, request.body as Parameters<typeof supplierService.createSupplier>[1]);
  });
}
