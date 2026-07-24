import { pool, withTransaction } from "../db/pool.js";
import { badRequest, notFound } from "../lib/errors.js";
import { resolveOrgId } from "./org.service.js";

export async function listReceivables(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT r.*, p.legal_name AS customer_name
     FROM finance.receivables r
     JOIN party.customers c ON c.party_id = r.customer_id
     JOIN party.parties p ON p.id = c.party_id
     WHERE r.organization_id = $1
     ORDER BY r.due_date`,
    [organizationId],
  );
  return result.rows;
}

export async function listPayables(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT ap.*, p.legal_name AS supplier_name
     FROM finance.payables ap
     JOIN party.suppliers s ON s.party_id = ap.supplier_id
     JOIN party.parties p ON p.id = s.party_id
     WHERE ap.organization_id = $1
     ORDER BY ap.due_date`,
    [organizationId],
  );
  return result.rows;
}

export async function allocatePayment(
  orgId: string | undefined,
  data: {
    direction: "in" | "out";
    receivableId?: string;
    payableId?: string;
    amount: number;
    paidAt?: string;
    method?: string;
    externalRef?: string;
    notes?: string;
  },
  userId?: string,
) {
  const organizationId = await resolveOrgId(orgId);
  if (data.amount <= 0) throw badRequest("Valor deve ser positivo.");

  return withTransaction(async (client) => {
    if (data.direction === "in") {
      if (!data.receivableId) throw badRequest("Informe receivableId.");
      const rec = await client.query(
        `SELECT * FROM finance.receivables WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [data.receivableId, organizationId],
      );
      if (!rec.rows[0]) throw notFound("Conta a receber");
      const open = Number(rec.rows[0].amount_open);
      if (data.amount > open) throw badRequest("Valor maior que saldo em aberto.");
      const newOpen = open - data.amount;
      const status = newOpen <= 0 ? "paga" : "parcial";
      await client.query(
        `UPDATE finance.receivables SET amount_open = $2, status = $3, updated_at = now() WHERE id = $1`,
        [data.receivableId, Math.max(0, newOpen), status],
      );
    } else {
      if (!data.payableId) throw badRequest("Informe payableId.");
      const pay = await client.query(
        `SELECT * FROM finance.payables WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [data.payableId, organizationId],
      );
      if (!pay.rows[0]) throw notFound("Conta a pagar");
      const open = Number(pay.rows[0].amount_open);
      if (data.amount > open) throw badRequest("Valor maior que saldo em aberto.");
      const newOpen = open - data.amount;
      const status = newOpen <= 0 ? "paga" : "parcial";
      await client.query(
        `UPDATE finance.payables SET amount_open = $2, status = $3, updated_at = now() WHERE id = $1`,
        [data.payableId, Math.max(0, newOpen), status],
      );
    }

    const alloc = await client.query(
      `INSERT INTO finance.payment_allocations
         (direction, receivable_id, payable_id, amount, paid_at, method, external_ref, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.direction,
        data.receivableId ?? null,
        data.payableId ?? null,
        data.amount,
        data.paidAt ?? new Date().toISOString().slice(0, 10),
        data.method ?? null,
        data.externalRef ?? null,
        data.notes ?? null,
        userId ?? null,
      ],
    );
    return alloc.rows[0];
  });
}
