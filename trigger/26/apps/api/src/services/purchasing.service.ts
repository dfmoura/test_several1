import { pool, withTransaction } from "../db/pool.js";
import { nextDocNumber } from "../lib/doc-number.js";
import { emitOutboxEvent } from "../lib/outbox.js";
import { badRequest, notFound } from "../lib/errors.js";
import { getWarehouse } from "./inventory.service.js";
import { resolveOrgId } from "./org.service.js";

export async function listPurchaseOrders(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT po.*, p.legal_name AS supplier_name
     FROM purchasing.purchase_orders po
     JOIN party.suppliers s ON s.party_id = po.supplier_id
     JOIN party.parties p ON p.id = s.party_id
     WHERE po.organization_id = $1
     ORDER BY po.created_at DESC`,
    [organizationId],
  );
  return result.rows;
}

export async function getPurchaseOrder(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const po = await pool.query(
    `SELECT * FROM purchasing.purchase_orders WHERE id = $1 AND organization_id = $2`,
    [id, organizationId],
  );
  if (!po.rows[0]) throw notFound("Pedido de compra");
  const lines = await pool.query(
    `SELECT pol.*, i.sku, i.name FROM purchasing.purchase_order_lines pol
     JOIN catalog.items i ON i.id = pol.item_id
     WHERE pol.purchase_order_id = $1 ORDER BY pol.line_no`,
    [id],
  );
  return { ...po.rows[0], lines: lines.rows };
}

export async function createPurchaseOrder(
  orgId: string | undefined,
  data: {
    supplierId: string;
    paymentTerms?: string;
    paymentDueDate?: string;
    expectedDate?: string;
    notes?: string;
    lines: Array<{ itemId: string; qtyOrdered: number; unitPrice: number }>;
  },
) {
  const organizationId = await resolveOrgId(orgId);
  if (!data.lines?.length) throw badRequest("Informe ao menos uma linha.");

  return withTransaction(async (client) => {
    const number = await nextDocNumber(client, organizationId, "po");
    const poResult = await client.query(
      `INSERT INTO purchasing.purchase_orders
         (organization_id, number, supplier_id, status, payment_terms, payment_due_date, expected_date, notes)
       VALUES ($1,$2,$3,'enviado',$4,$5,$6,$7)
       RETURNING *`,
      [
        organizationId,
        number,
        data.supplierId,
        data.paymentTerms ?? null,
        data.paymentDueDate ?? null,
        data.expectedDate ?? null,
        data.notes ?? null,
      ],
    );
    const po = poResult.rows[0];
    let lineNo = 1;
    for (const line of data.lines) {
      await client.query(
        `INSERT INTO purchasing.purchase_order_lines
           (purchase_order_id, item_id, qty_ordered, unit_price, line_no)
         VALUES ($1,$2,$3,$4,$5)`,
        [po.id, line.itemId, line.qtyOrdered, line.unitPrice, lineNo++],
      );
    }
    await emitOutboxEvent(client, "purchase_order.created", "purchase_order", po.id as string, {
      number,
    });
    return getPurchaseOrder(po.id as string, organizationId);
  });
}

export async function receiveGoods(
  orgId: string | undefined,
  purchaseOrderId: string,
  data: {
    warehouseId?: string;
    lines: Array<{ purchaseOrderLineId: string; qty: number }>;
    notes?: string;
    paymentDueDate?: string;
  },
  userId?: string,
) {
  const organizationId = await resolveOrgId(orgId);
  const po = await getPurchaseOrder(purchaseOrderId, organizationId);
  if (po.status === "cancelado") throw badRequest("Pedido de compra cancelado.");

  const warehouse = data.warehouseId
    ? { id: data.warehouseId }
    : await getWarehouse(organizationId, "MAIN");
  if (!warehouse) throw badRequest("Depósito não encontrado.");

  return withTransaction(async (client) => {
    const receipt = await client.query(
      `INSERT INTO purchasing.goods_receipts (purchase_order_id, warehouse_id, notes)
       VALUES ($1,$2,$3) RETURNING *`,
      [purchaseOrderId, warehouse.id, data.notes ?? null],
    );
    const receiptId = receipt.rows[0].id as string;
    let totalAmount = 0;

    for (const line of data.lines) {
      const pol = (po.lines as Array<Record<string, unknown>>).find(
        (l) => l.id === line.purchaseOrderLineId,
      );
      if (!pol) throw badRequest("Linha do pedido de compra inválida.");
      const unitPrice = Number(pol.unit_price);
      const itemId = pol.item_id as string;
      const lineTotal = line.qty * unitPrice;
      totalAmount += lineTotal;

      await client.query(
        `INSERT INTO purchasing.goods_receipt_lines
           (goods_receipt_id, purchase_order_line_id, item_id, qty, unit_price)
         VALUES ($1,$2,$3,$4,$5)`,
        [receiptId, line.purchaseOrderLineId, itemId, line.qty, unitPrice],
      );
      await client.query(
        `UPDATE purchasing.purchase_order_lines
         SET qty_received = qty_received + $2 WHERE id = $1`,
        [line.purchaseOrderLineId, line.qty],
      );
      await client.query(
        `INSERT INTO inventory.stock_balances (warehouse_id, item_id, qty_on_hand)
         VALUES ($1,$2,$3)
         ON CONFLICT (warehouse_id, item_id)
         DO UPDATE SET qty_on_hand = inventory.stock_balances.qty_on_hand + $3`,
        [warehouse.id, itemId, line.qty],
      );
      await client.query(
        `INSERT INTO inventory.stock_movements
           (organization_id, warehouse_id, item_id, movement_type, qty, unit_cost, ref_type, ref_id, created_by)
         VALUES ($1,$2,$3,'entrada_compra',$4,$5,'goods_receipt',$6,$7)`,
        [organizationId, warehouse.id, itemId, line.qty, unitPrice, receiptId, userId ?? null],
      );
    }

    const allReceived = await client.query(
      `SELECT bool_and(qty_received >= qty_ordered) AS complete
       FROM purchasing.purchase_order_lines WHERE purchase_order_id = $1`,
      [purchaseOrderId],
    );
    const newStatus = allReceived.rows[0]?.complete ? "recebido" : "parcial";
    await client.query(
      `UPDATE purchasing.purchase_orders SET status = $2, updated_at = now() WHERE id = $1`,
      [purchaseOrderId, newStatus],
    );

    const dueDate =
      data.paymentDueDate ?? po.payment_due_date ?? new Date().toISOString().slice(0, 10);
    await client.query(
      `INSERT INTO finance.payables
         (organization_id, purchase_order_id, supplier_id, description, due_date, amount, amount_open, status)
       VALUES ($1,$2,$3,$4,$5,$6,$6,'aberta')`,
      [
        organizationId,
        purchaseOrderId,
        po.supplier_id,
        `Recebimento PO ${po.number}`,
        dueDate,
        totalAmount,
      ],
    );

    await emitOutboxEvent(client, "goods.received", "purchase_order", purchaseOrderId, {
      receiptId,
      totalAmount,
    });
    return { receipt: receipt.rows[0], purchaseOrder: await getPurchaseOrder(purchaseOrderId, organizationId) };
  });
}
