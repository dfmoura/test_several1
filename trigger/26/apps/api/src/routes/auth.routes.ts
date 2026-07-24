import type { FastifyInstance } from "fastify";
import * as authService from "../services/auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request) => {
    const body = request.body as { email?: string; password?: string };
    return authService.login(body.email ?? "", body.password ?? "");
  });
}
