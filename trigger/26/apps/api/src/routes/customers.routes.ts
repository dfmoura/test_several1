import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth.js";
import * as customerService from "../services/customer.service.js";

export async function customerRoutes(app: FastifyInstance) {
  app.get("/api/customers", async (request) => {
    const user = requireAuth(request);
    return customerService.listCustomers(user.orgId);
  });

  app.get("/api/customers/lookup/cnpj/:cnpj", async (request) => {
    requireAuth(request);
    const { cnpj } = request.params as { cnpj: string };
    return customerService.lookupCustomerCnpj(cnpj);
  });

  app.get("/api/cep/:cep", async (request) => {
    requireAuth(request);
    const { cep } = request.params as { cep: string };
    return customerService.lookupCepPublic(cep);
  });

  app.get("/api/customers/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return customerService.getCustomer(id, user.orgId);
  });

  app.post("/api/customers", async (request) => {
    const user = requireAuth(request);
    return customerService.createCustomer(user.orgId, request.body as Parameters<typeof customerService.createCustomer>[1]);
  });

  app.patch("/api/customers/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return customerService.updateCustomer(id, user.orgId, request.body as Parameters<typeof customerService.updateCustomer>[2]);
  });

  app.delete("/api/customers/:id", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    await customerService.deleteCustomer(id, user.orgId);
    return { ok: true };
  });

  app.get("/api/customers/:id/addresses", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return customerService.listCustomerAddresses(id, user.orgId);
  });

  app.post("/api/customers/:id/addresses", async (request) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    return customerService.createCustomerAddress(id, user.orgId, request.body as Parameters<typeof customerService.createCustomerAddress>[2]);
  });
}
