import { pool } from "../db/pool.js";
import { env } from "../lib/env.js";
import { notFound } from "../lib/errors.js";

let cachedOrgId: string | null = null;

export async function resolveOrgId(preferred?: string): Promise<string> {
  if (preferred) return preferred;
  if (env.orgId) return env.orgId;
  if (cachedOrgId) return cachedOrgId;
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM party.organizations ORDER BY created_at ASC LIMIT 1`,
  );
  if (!result.rows[0]) {
    throw notFound("Organização");
  }
  cachedOrgId = result.rows[0].id;
  return cachedOrgId;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const result = await pool.query<{ code: string }>(
    `SELECT r.code FROM app_auth.user_roles ur
     JOIN app_auth.roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId],
  );
  return result.rows.map((r) => r.code);
}

export function hasRole(roles: string[], ...allowed: string[]): boolean {
  return allowed.some((r) => roles.includes(r) || roles.includes("admin"));
}
