import type { FastifyReply, FastifyRequest } from "fastify";
import { extractBearer, verifyToken } from "../lib/auth.js";
import { unauthorized } from "../lib/errors.js";

const PUBLIC_PREFIXES = [
  "/health",
  "/ready",
  "/api/auth/login",
  "/api/webhooks/inter",
];

export function isPublicRoute(url: string): boolean {
  const path = url.split("?")[0];
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  if (isPublicRoute(request.url)) return;
  const token = extractBearer(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({ error: "Não autorizado.", code: "UNAUTHORIZED" });
  }
  try {
    request.user = verifyToken(token);
  } catch {
    return reply.status(401).send({ error: "Token inválido.", code: "UNAUTHORIZED" });
  }
}

export function requireAuth(request: FastifyRequest) {
  if (!request.user) throw unauthorized();
  return request.user;
}
