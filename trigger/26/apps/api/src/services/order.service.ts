import { pool, withTransaction } from "../db/pool.js";
import { nextDocNumber } from "../lib/doc-number.js";
import { emitOutboxEvent } from "../lib/outbox.js";
import { badRequest, notFound } from "../lib/errors.js";
import { getApprovedTier, getQuote } from "./quote.service.js";
import { resolveOrgId } from "./org.service.js";

export async function listOrders(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT id, number, quote_id, customer_id, status, order_date, payment_terms,
            expected_receipt_date, created_at
     FROM commercial.sales_orders
     WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [organizationId],
  );
  return result.rows;
}

export async function getOrder(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const order = await pool.query(
    `SELECT * FROM commercial.sales_orders
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, organizationId],
  );
  if (!order.rows[0]) throw notFound("Pedido");
  const lines = await pool.query(
    `SELECT * FROM commercial.sales_order_lines WHERE sales_order_id = $1 ORDER BY line_no`,
    [id],
  );
  return { ...order.rows[0], lines: lines.rows };
}

export async function createOrderFromQuote(
  orgId: string | undefined,
  quoteId: string,
  data: {
    paymentTerms: string;
    expectedReceiptDate?: string;
    shippingAddressId?: string;
    billingAddressId?: string;
    notes?: string;
    selectedQuantity?: number;
  },
) {
  const organizationId = await resolveOrgId(orgId);
  let quote = await getQuote(quoteId, organizationId);
  if (quote.status !== "aprovado") {
    const qty =
      data.selectedQuantity ??
      Number((quote.tiers as Array<{ quantity: string }>)[0]?.quantity ?? 0);
    if (!qty) throw badRequest("Informe a quantidade aprovada.");
    const { approveQuote } = await import("./quote.service.js");
    quote = await approveQuote(quoteId, organizationId, qty);
  } else if (data.selectedQuantity) {
    await pool.query(
      `UPDATE commercial.quotes SET snapshot = snapshot || $2::jsonb, updated_at = now() WHERE id = $1`,
      [quoteId, JSON.stringify({ approvedQuantity: data.selectedQuantity })],
    );
  }
  const { quote: approvedQuote, tier, quantity } = await getApprovedTier(quoteId);
  quote = approvedQuote;

  const existing = await pool.query(
    `SELECT id FROM commercial.sales_orders WHERE quote_id = $1 AND deleted_at IS NULL`,
    [quoteId],
  );
  if (existing.rows[0]) {
    throw badRequest("Já existe pedido para este orçamento.");
  }

  const line = (quote.lines as Array<Record<string, unknown>>)[0];
  const unitPrice = Number(tier.label_price);
  const matrixPrice = Number(tier.matrix_price ?? 0);
  const lineTotal = unitPrice + matrixPrice;

  const created = await withTransaction(async (client) => {
    const number = await nextDocNumber(client, organizationId, "order");
    const orderResult = await client.query(
      `INSERT INTO commercial.sales_orders
         (organization_id, number, quote_id, customer_id, salesperson_id, status,
          payment_terms, expected_receipt_date, shipping_address_id, billing_address_id, notes)
       VALUES ($1,$2,$3,$4,$5,'aberto',$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        organizationId,
        number,
        quoteId,
        quote.customer_id,
        quote.salesperson_id,
        data.paymentTerms,
        data.expectedReceiptDate ?? null,
        data.shippingAddressId ?? null,
        data.billingAddressId ?? null,
        data.notes ?? null,
      ],
    );
    const order = orderResult.rows[0];
    await client.query(
      `INSERT INTO commercial.sales_order_lines
         (sales_order_id, quote_line_id, quote_tier_id, line_no, description, quantity,
          unit_price, matrix_price, line_total, spec_snapshot)
       VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9)`,
      [
        order.id,
        line.id,
        tier.id,
        line.description ?? line.measure_label,
        quantity,
        unitPrice,
        matrixPrice,
        lineTotal,
        JSON.stringify({ line, tier }),
      ],
    );
    const lineInsert = await client.query(
      `SELECT id FROM commercial.sales_order_lines WHERE sales_order_id = $1 ORDER BY line_no LIMIT 1`,
      [order.id],
    );
    await emitOutboxEvent(client, "order.created", "order", order.id as string, {
      quoteId,
      number,
    });

    return {
      orderId: order.id as string,
      lineId: lineInsert.rows[0]?.id as string | undefined,
    };
  });

  if (created.lineId) {
    try {
      const { createWorkOrder } = await import("./work-order.service.js");
      await createWorkOrder(organizationId, created.lineId, {
        machineId: undefined,
        dieId: (quote.lines as Array<{ die_id?: string }>)[0]?.die_id,
      });
    } catch {
      // OS pode ser criada manualmente se falhar
    }
  }
  return getOrder(created.orderId, organizationId);
}

const ORDER_STATUS: Record<string, string[]> = {
  aberto: ["em_producao", "cancelado"],
  em_producao: ["faturado", "cancelado"],
  faturado: ["entregue", "encerrado"],
  entregue: ["encerrado"],
};

export async function updateOrderStatus(id: string, orgId: string | undefined, status: string) {
  const order = await getOrder(id, orgId);
  const allowed = ORDER_STATUS[order.status as string] ?? [];
  if (!allowed.includes(status)) {
    throw badRequest(`Transição inválida de '${order.status}' para '${status}'.`);
  }
  await pool.query(
    `UPDATE commercial.sales_orders SET status = $2, updated_at = now() WHERE id = $1`,
    [id, status],
  );
  return getOrder(id, orgId);
}
