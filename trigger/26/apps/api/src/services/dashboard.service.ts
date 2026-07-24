import { pool } from "../db/pool.js";
import { resolveOrgId } from "./org.service.js";

export async function getDashboardCounts(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const [quotes, orders, wo, ar, stock] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM commercial.quotes
       WHERE organization_id = $1 AND deleted_at IS NULL
         AND status IN ('rascunho','enviado')`,
      [organizationId],
    ),
    pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM commercial.sales_orders
       WHERE organization_id = $1 AND deleted_at IS NULL
         AND status IN ('aberto','em_producao')`,
      [organizationId],
    ),
    pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pcp.work_orders
       WHERE organization_id = $1
         AND status IN ('liberada','em_execucao')
         AND created_at::date = CURRENT_DATE`,
      [organizationId],
    ),
    pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM finance.receivables
       WHERE organization_id = $1 AND status IN ('aberta','parcial')
         AND due_date <= CURRENT_DATE`,
      [organizationId],
    ),
    pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM inventory.stock_balances sb
       JOIN inventory.warehouses w ON w.id = sb.warehouse_id
       JOIN catalog.items i ON i.id = sb.item_id
       WHERE w.organization_id = $1
         AND i.is_stockable = true
         AND (sb.qty_on_hand - sb.qty_reserved) <= 0`,
      [organizationId],
    ),
  ]);
  return {
    quotesOpen: Number(quotes.rows[0]?.count ?? 0),
    ordersOpen: Number(orders.rows[0]?.count ?? 0),
    workOrdersToday: Number(wo.rows[0]?.count ?? 0),
    receivablesDue: Number(ar.rows[0]?.count ?? 0),
    stockCritical: Number(stock.rows[0]?.count ?? 0),
  };
}
