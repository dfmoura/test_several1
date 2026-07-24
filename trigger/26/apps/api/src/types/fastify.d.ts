import type { JwtPayload } from "../lib/auth.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export {};
