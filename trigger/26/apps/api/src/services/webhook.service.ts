import { pool, withTransaction } from "../db/pool.js";
import { badRequest } from "../lib/errors.js";

export async function handleInterWebhook(payload: {
  eventId?: string;
  eventType?: string;
  ourNumber?: string;
  chargeId?: string;
  paidAmount?: number;
  paidAt?: string;
}) {
  const eventId = payload.eventId ?? payload.chargeId ?? JSON.stringify(payload).slice(0, 64);
  const eventType = payload.eventType ?? "charge.paid";

  return withTransaction(async (client) => {
    const inbox = await client.query(
      `INSERT INTO integration.webhook_inbox (provider, event_id, payload)
       VALUES ('inter', $1, $2)
       ON CONFLICT (provider, event_id) DO NOTHING
       RETURNING id, processed_at`,
      [eventId, JSON.stringify(payload)],
    );

    if (!inbox.rows[0]) {
      return { duplicate: true, message: "Webhook já processado." };
    }

    if (eventType !== "charge.paid" && eventType !== "paga") {
      await client.query(
        `UPDATE integration.webhook_inbox SET processed_at = now() WHERE provider = 'inter' AND event_id = $1`,
        [eventId],
      );
      return { processed: true, action: "ignored", eventType };
    }

    const ourNumber = payload.ourNumber;
    if (!ourNumber) throw badRequest("ourNumber ausente no webhook.");

    const chargeResult = await client.query(
      `SELECT c.*, r.id AS receivable_id
       FROM billing.charges c
       LEFT JOIN finance.receivables r ON r.charge_id = c.id
       WHERE c.our_number = $1 FOR UPDATE`,
      [ourNumber],
    );
    const charge = chargeResult.rows[0];
    if (!charge) {
      await client.query(
        `UPDATE integration.webhook_inbox SET processed_at = now() WHERE provider = 'inter' AND event_id = $1`,
        [eventId],
      );
      return { processed: true, action: "charge_not_found" };
    }

    const paidAmount = payload.paidAmount ?? Number(charge.amount);
    const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();

    await client.query(
      `UPDATE billing.charges SET status = 'paga', paid_amount = $2, paid_at = $3, updated_at = now()
       WHERE id = $1`,
      [charge.id, paidAmount, paidAt],
    );

    if (charge.receivable_id) {
      await client.query(
        `UPDATE finance.receivables SET amount_open = 0, status = 'paga', updated_at = now()
         WHERE id = $1`,
        [charge.receivable_id],
      );
      await client.query(
        `INSERT INTO finance.payment_allocations
           (direction, receivable_id, amount, paid_at, method, external_ref, notes)
         VALUES ('in', $1, $2, $3, 'pix', $4, 'Baixa automática webhook Inter')`,
        [
          charge.receivable_id,
          paidAmount,
          paidAt.toISOString().slice(0, 10),
          eventId,
        ],
      );
    }

    await client.query(
      `UPDATE integration.webhook_inbox SET processed_at = now() WHERE provider = 'inter' AND event_id = $1`,
      [eventId],
    );

    return { processed: true, action: "paid", chargeId: charge.id };
  });
}
