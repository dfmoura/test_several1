import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { signToken } from "../lib/auth.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import { getUserRoles, resolveOrgId } from "./org.service.js";

export async function login(email: string, password: string) {
  if (!email || !password) {
    throw badRequest("E-mail e senha são obrigatórios.");
  }
  const result = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    is_active: boolean;
  }>(
    `SELECT id, email, password_hash, full_name, is_active
     FROM app_auth.users
     WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
    [email],
  );
  const user = result.rows[0];
  if (!user || !user.is_active) {
    throw unauthorized("Credenciais inválidas.");
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw unauthorized("Credenciais inválidas.");
  }
  const roles = await getUserRoles(user.id);
  const orgId = await resolveOrgId();
  const token = signToken({ sub: user.id, email: user.email, roles, orgId });
  return {
    token,
    user: { id: user.id, email: user.email, fullName: user.full_name, roles, orgId },
  };
}
