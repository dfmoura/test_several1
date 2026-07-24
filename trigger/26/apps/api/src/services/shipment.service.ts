import { pool, withTransaction } from "../db/pool.js";
import { emitOutboxEvent } from "../lib/outbox.js";
import { badRequest, notFound } from "../lib/errors.js";
import { getOrder } from "./order.service.js";
import { resolveOrgId } from "./org.service.js";

const SHIPMENT_FLOW: Record<string, string[]> = {
  aguardando: ["expedida"],
  expedida: ["em_transito"],
  em_transito: ["entregue", "recusada", "extravio"],
};

export async function listShipments(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT sh.*, so.number AS order_number
     FROM billing.shipments sh
     JOIN commercial.sales_orders so ON so.id = sh.sales_order_id
     WHERE so.organization_id = $1
     ORDER BY sh.created_at DESC`,
    [organizationId],
  );
  return result.rows;
}

export async function getShipment(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT sh.* FROM billing.shipments sh
     JOIN commercial.sales_orders so ON so.id = sh.sales_order_id
     WHERE sh.id = $1 AND so.organization_id = $2`,
    [id, organizationId],
  );
  if (!result.rows[0]) throw notFound("Remessa");
  const confirmations = await pool.query(
    `SELECT * FROM billing.delivery_confirmations WHERE shipment_id = $1`,
    [id],
  );
  return { ...result.rows[0], confirmations: confirmations.rows };
}

export async function createShipment(
  orgId: string | undefined,
  salesOrderId: string,
  data?: { carrierName?: string; trackingCode?: string; addressSnapshot?: Record<string, unknown> },
) {
  const organizationId = await resolveOrgId(orgId);
  const order = await getOrder(salesOrderId, organizationId);

  let addressSnapshot = data?.addressSnapshot ?? {};
  if (order.shipping_address_id) {
    const addr = await pool.query(`SELECT * FROM party.addresses WHERE id = $1`, [
      order.shipping_address_id,
    ]);
    if (addr.rows[0]) addressSnapshot = addr.rows[0] as Record<string, unknown>;
  }

  const result = await pool.query(
    `INSERT INTO billing.shipments
       (sales_order_id, status, carrier_name, tracking_code, address_snapshot)
     VALUES ($1,'aguardando',$2,$3,$4)
     RETURNING *`,
    [salesOrderId, data?.carrierName ?? null, data?.trackingCode ?? null, JSON.stringify(addressSnapshot)],
  );
  return result.rows[0];
}

export async function advanceShipmentStatus(id: string, orgId: string | undefined, status: string) {
  const shipment = await getShipment(id, orgId);
  const allowed = SHIPMENT_FLOW[shipment.status as string] ?? [];
  if (!allowed.includes(status)) {
    throw badRequest(`Transição inválida de '${shipment.status}' para '${status}'.`);
  }
  const updates: Record<string, unknown> = { status };
  if (status === "expedida") updates.shipped_at = new Date();
  if (status === "entregue") updates.delivered_at = new Date();

  await pool.query(
    `UPDATE billing.shipments SET status = $2,
       shipped_at = COALESCE($3, shipped_at),
       delivered_at = COALESCE($4, delivered_at),
       updated_at = now()
     WHERE id = $1`,
    [id, status, updates.shipped_at ?? null, updates.delivered_at ?? null],
  );
  return getShipment(id, orgId);
}

export async function confirmDelivery(
  id: string,
  orgId: string | undefined,
  data: { confirmedByName?: string; notes?: string; validated?: boolean },
  userId?: string,
) {
  const shipment = await getShipment(id, orgId);
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO billing.delivery_confirmations
         (shipment_id, confirmed_by_name, notes, validated, validated_by, validated_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        data.confirmedByName ?? null,
        data.notes ?? null,
        data.validated ?? false,
        data.validated ? userId : null,
        data.validated ? new Date() : null,
      ],
    );
    await client.query(
      `UPDATE billing.shipments SET status = 'entregue', delivered_at = now(), updated_at = now() WHERE id = $1`,
      [id],
    );
    await client.query(
      `UPDATE commercial.sales_orders SET status = 'entregue', updated_at = now()
       WHERE id = $1`,
      [shipment.sales_order_id],
    );
    await emitOutboxEvent(client, "shipment.delivered", "shipment", id, {});
    return getShipment(id, orgId);
  });
}
