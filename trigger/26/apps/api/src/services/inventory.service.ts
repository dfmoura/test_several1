import { pool } from "../db/pool.js";
import { resolveOrgId } from "./org.service.js";

export async function listBalances(orgId?: string, warehouseId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const params: unknown[] = [organizationId];
  let warehouseFilter = "";
  if (warehouseId) {
    params.push(warehouseId);
    warehouseFilter = "AND w.id = $2";
  }
  const result = await pool.query(
    `SELECT w.code AS warehouse_code, w.name AS warehouse_name,
            i.id AS item_id, i.sku, i.name, i.uom_code,
            sb.qty_on_hand, sb.qty_reserved,
            (sb.qty_on_hand - sb.qty_reserved) AS qty_available
     FROM inventory.stock_balances sb
     JOIN inventory.warehouses w ON w.id = sb.warehouse_id
     JOIN catalog.items i ON i.id = sb.item_id
     WHERE w.organization_id = $1 ${warehouseFilter}
     ORDER BY i.name`,
    params,
  );
  return result.rows;
}

export async function listMovements(orgId?: string, limit = 100) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT sm.*, i.sku, i.name, w.code AS warehouse_code
     FROM inventory.stock_movements sm
     JOIN catalog.items i ON i.id = sm.item_id
     JOIN inventory.warehouses w ON w.id = sm.warehouse_id
     WHERE sm.organization_id = $1
     ORDER BY sm.moved_at DESC
     LIMIT $2`,
    [organizationId, limit],
  );
  return result.rows;
}

export async function getWarehouse(orgId?: string, code = "MAIN") {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT * FROM inventory.warehouses WHERE organization_id = $1 AND code = $2`,
    [organizationId, code],
  );
  return result.rows[0] ?? null;
}
