import { pool, withTransaction } from "../db/pool.js";
import { nextDocNumber } from "../lib/doc-number.js";
import { emitOutboxEvent } from "../lib/outbox.js";
import { badRequest, notFound } from "../lib/errors.js";
import { getOrder } from "./order.service.js";
import { resolveOrgId } from "./org.service.js";

export async function listWorkOrders(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT wo.*, sol.description, sol.quantity
     FROM pcp.work_orders wo
     JOIN commercial.sales_order_lines sol ON sol.id = wo.sales_order_line_id
     WHERE wo.organization_id = $1
     ORDER BY wo.created_at DESC`,
    [organizationId],
  );
  return result.rows;
}

export async function getWorkOrder(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT * FROM pcp.work_orders WHERE id = $1 AND organization_id = $2`,
    [id, organizationId],
  );
  if (!result.rows[0]) throw notFound("Ordem de serviço");
  const materials = await pool.query(
    `SELECT wom.*, i.sku, i.name FROM pcp.work_order_materials wom
     JOIN catalog.items i ON i.id = wom.item_id WHERE wom.work_order_id = $1`,
    [id],
  );
  return { ...result.rows[0], materials: materials.rows };
}

export async function createWorkOrder(
  orgId: string | undefined,
  salesOrderLineId: string,
  data?: { machineId?: string; dieId?: string; notes?: string },
) {
  const organizationId = await resolveOrgId(orgId);
  const lineResult = await pool.query(
    `SELECT sol.*, so.organization_id, so.id AS order_id
     FROM commercial.sales_order_lines sol
     JOIN commercial.sales_orders so ON so.id = sol.sales_order_id
     WHERE sol.id = $1 AND so.organization_id = $2 AND so.deleted_at IS NULL`,
    [salesOrderLineId, organizationId],
  );
  const line = lineResult.rows[0];
  if (!line) throw notFound("Linha do pedido");

  const spec = line.spec_snapshot as { line?: Record<string, unknown>; tier?: Record<string, unknown> };
  const paperName = spec.line?.paper_name as string | undefined;
  const areaM2 = spec.tier?.area_m2 ? Number(spec.tier.area_m2) : 0;
  const wasteSetup = spec.tier?.waste_setup_m2 ? Number(spec.tier.waste_setup_m2) : 0;
  const qtyPaper = areaM2 + wasteSetup;

  const woId = await withTransaction(async (client) => {
    const number = await nextDocNumber(client, organizationId, "wo");
    const woResult = await client.query(
      `INSERT INTO pcp.work_orders
         (organization_id, number, sales_order_line_id, machine_id, die_id, status, notes)
       VALUES ($1,$2,$3,$4,$5,'planejada',$6)
       RETURNING *`,
      [
        organizationId,
        number,
        salesOrderLineId,
        data?.machineId ?? null,
        data?.dieId ?? spec.line?.die_id ?? null,
        data?.notes ?? null,
      ],
    );
    const wo = woResult.rows[0];

    if (paperName && qtyPaper > 0) {
      const itemResult = await client.query(
        `SELECT id FROM catalog.items
         WHERE organization_id = $1 AND name ILIKE $2 AND deleted_at IS NULL LIMIT 1`,
        [organizationId, paperName],
      );
      if (itemResult.rows[0]) {
        await client.query(
          `INSERT INTO pcp.work_order_materials (work_order_id, item_id, uom_code, qty_planned)
           VALUES ($1,$2,'m2',$3)`,
          [wo.id, itemResult.rows[0].id, qtyPaper],
        );
      }
    }

    await client.query(
      `UPDATE commercial.sales_orders SET status = 'em_producao', updated_at = now() WHERE id = $1`,
      [line.order_id],
    );
    await emitOutboxEvent(client, "work_order.created", "work_order", wo.id as string, { number });
    return wo.id as string;
  });
  return getWorkOrder(woId, organizationId);
}

async function getDefaultWarehouse(client: import("../db/pool.js").DbClient, orgId: string): Promise<string> {
  const result = await client.query(
    `SELECT id FROM inventory.warehouses WHERE organization_id = $1 ORDER BY code LIMIT 1`,
    [orgId],
  );
  if (!result.rows[0]) throw badRequest("Nenhum depósito cadastrado.");
  return result.rows[0].id as string;
}

export async function liberarWorkOrder(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const wo = await getWorkOrder(id, organizationId);
  if (wo.status !== "planejada") {
    throw badRequest("OS só pode ser liberada no status planejada.");
  }

  const result = await withTransaction(async (client) => {
    const warehouseId = await getDefaultWarehouse(client, organizationId);
    const shortages: Array<{ itemId: string; sku: string; name: string; needed: number; available: number }> = [];

    for (const mat of wo.materials as Array<Record<string, unknown>>) {
      const itemId = mat.item_id as string;
      const needed = Number(mat.qty_planned);
      const bal = await client.query(
        `SELECT qty_on_hand, qty_reserved FROM inventory.stock_balances
         WHERE warehouse_id = $1 AND item_id = $2`,
        [warehouseId, itemId],
      );
      const onHand = Number(bal.rows[0]?.qty_on_hand ?? 0);
      const reserved = Number(bal.rows[0]?.qty_reserved ?? 0);
      const available = onHand - reserved;
      if (available < needed) {
        shortages.push({
          itemId,
          sku: String(mat.sku),
          name: String(mat.name),
          needed,
          available,
        });
      }
    }

    if (shortages.length > 0) {
      return {
        success: false as const,
        message: "Estoque insuficiente. Sugestão: criar pedido de compra.",
        shortages,
      };
    }

    for (const mat of wo.materials as Array<Record<string, unknown>>) {
      const itemId = mat.item_id as string;
      const needed = Number(mat.qty_planned);
      await client.query(
        `INSERT INTO inventory.stock_reservations (work_order_id, warehouse_id, item_id, qty, status)
         VALUES ($1,$2,$3,$4,'ativa')`,
        [id, warehouseId, itemId, needed],
      );
      await client.query(
        `UPDATE inventory.stock_balances SET qty_reserved = qty_reserved + $3
         WHERE warehouse_id = $1 AND item_id = $2`,
        [warehouseId, itemId, needed],
      );
    }

    await client.query(
      `UPDATE pcp.work_orders SET status = 'liberada', updated_at = now() WHERE id = $1`,
      [id],
    );
    await emitOutboxEvent(client, "work_order.released", "work_order", id, {});
    return { success: true as const };
  });

  if (!result.success) return result;
  return { success: true, workOrder: await getWorkOrder(id, organizationId) };
}

export async function startWorkOrder(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const wo = await getWorkOrder(id, organizationId);
  if (wo.status !== "liberada") throw badRequest("OS precisa estar liberada para iniciar.");
  await pool.query(
    `UPDATE pcp.work_orders SET status = 'em_execucao', actual_start = now(), updated_at = now() WHERE id = $1`,
    [id],
  );
  return getWorkOrder(id, organizationId);
}

export async function completeWorkOrder(id: string, orgId?: string, userId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const wo = await getWorkOrder(id, organizationId);
  if (wo.status !== "em_execucao" && wo.status !== "liberada") {
    throw badRequest("OS precisa estar em execução para concluir.");
  }

  return withTransaction(async (client) => {
    const reservations = await client.query(
      `SELECT * FROM inventory.stock_reservations
       WHERE work_order_id = $1 AND status = 'ativa' FOR UPDATE`,
      [id],
    );

    for (const res of reservations.rows) {
      const qty = Number(res.qty);
      await client.query(
        `UPDATE inventory.stock_balances
         SET qty_on_hand = qty_on_hand - $3, qty_reserved = qty_reserved - $3
         WHERE warehouse_id = $1 AND item_id = $2`,
        [res.warehouse_id, res.item_id, qty],
      );
      await client.query(
        `INSERT INTO inventory.stock_movements
           (organization_id, warehouse_id, item_id, movement_type, qty, ref_type, ref_id, created_by)
         VALUES ($1,$2,$3,'saida_consumo_os',$4,'work_order',$5,$6)`,
        [organizationId, res.warehouse_id, res.item_id, -qty, id, userId ?? null],
      );
      await client.query(
        `UPDATE pcp.work_order_materials SET qty_consumed = qty_consumed + $2
         WHERE work_order_id = $1 AND item_id = $3`,
        [id, qty, res.item_id],
      );
      await client.query(
        `UPDATE inventory.stock_reservations SET status = 'consumida' WHERE id = $1`,
        [res.id],
      );
    }

    await client.query(
      `UPDATE pcp.work_orders SET status = 'concluida', actual_end = now(), updated_at = now() WHERE id = $1`,
      [id],
    );
    await emitOutboxEvent(client, "work_order.completed", "work_order", id, {});
    return getWorkOrder(id, organizationId);
  });
}
