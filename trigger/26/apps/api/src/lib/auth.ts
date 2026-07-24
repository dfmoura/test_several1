import jwt from "jsonwebtoken";
import { env } from "./env.js";

export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  orgId?: string;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.appSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.appSecret) as JwtPayload;
}

export function extractBearer(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
