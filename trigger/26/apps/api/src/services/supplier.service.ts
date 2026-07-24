import { pool, withTransaction } from "../db/pool.js";
import { resolveOrgId } from "./org.service.js";

export async function listSuppliers(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT p.id, p.document, p.legal_name, p.trade_name, p.email, p.phone,
            s.default_payment_terms, s.lead_time_days, s.is_active
     FROM party.suppliers s
     JOIN party.parties p ON p.id = s.party_id
     WHERE p.organization_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.legal_name`,
    [organizationId],
  );
  return result.rows;
}

export async function createSupplier(
  orgId: string | undefined,
  data: {
    document?: string;
    legalName: string;
    tradeName?: string;
    email?: string;
    phone?: string;
    defaultPaymentTerms?: string;
    leadTimeDays?: number;
  },
) {
  const organizationId = await resolveOrgId(orgId);
  return withTransaction(async (client) => {
    const party = await client.query(
      `INSERT INTO party.parties (organization_id, party_type, document, legal_name, trade_name, email, phone)
       VALUES ($1, 'company', $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        organizationId,
        data.document?.replace(/\D/g, "") ?? null,
        data.legalName,
        data.tradeName ?? null,
        data.email ?? null,
        data.phone ?? null,
      ],
    );
    const partyId = party.rows[0].id as string;
    await client.query(
      `INSERT INTO party.suppliers (party_id, default_payment_terms, lead_time_days)
       VALUES ($1, $2, $3)`,
      [partyId, data.defaultPaymentTerms ?? null, data.leadTimeDays ?? 0],
    );
    const row = await pool.query(
      `SELECT p.*, s.default_payment_terms, s.lead_time_days, s.is_active
       FROM party.suppliers s JOIN party.parties p ON p.id = s.party_id WHERE p.id = $1`,
      [partyId],
    );
    return row.rows[0];
  });
}
