import { pool } from "../db/pool.js";
import { resolveOrgId } from "./org.service.js";

export async function listItems(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT id, sku, name, item_type, uom_code, is_stockable, is_active, attrs
     FROM catalog.items
     WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY name`,
    [organizationId],
  );
  return result.rows;
}

export async function listMachines(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT id, code, name, cost_group, rpm_default, is_active
     FROM catalog.machines
     WHERE organization_id = $1 AND is_active = true
     ORDER BY code`,
    [organizationId],
  );
  return result.rows;
}

export async function listDies(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT id, code, label_measure, width_cm, height_cm, pull_cm, repeat_z,
            columns_default, die_kind, attrs, is_active
     FROM catalog.dies
     WHERE organization_id = $1 AND is_active = true
     ORDER BY code`,
    [organizationId],
  );
  return result.rows;
}

export async function getItemById(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT * FROM catalog.items WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, organizationId],
  );
  return result.rows[0] ?? null;
}
