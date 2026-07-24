import type { DbClient } from "../db/pool.js";
import { pool, withTransaction } from "../db/pool.js";
import { lookupCep, lookupCnpj } from "../adapters/index.js";
import { env } from "../lib/env.js";
import { badRequest, notFound } from "../lib/errors.js";
import { resolveOrgId } from "./org.service.js";

export async function listCustomers(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT p.id, p.document, p.legal_name, p.trade_name, p.email, p.phone,
            c.salesperson_id, c.default_payment_terms, c.credit_limit_cents, c.is_active
     FROM party.customers c
     JOIN party.parties p ON p.id = c.party_id
     WHERE p.organization_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.legal_name`,
    [organizationId],
  );
  return result.rows;
}

export async function getCustomer(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT p.*, c.salesperson_id, c.default_payment_terms, c.credit_limit_cents, c.is_active
     FROM party.customers c
     JOIN party.parties p ON p.id = c.party_id
     WHERE p.id = $1 AND p.organization_id = $2 AND p.deleted_at IS NULL`,
    [id, organizationId],
  );
  if (!result.rows[0]) throw notFound("Cliente");
  return result.rows[0];
}

export async function createCustomer(
  orgId: string | undefined,
  data: {
    document?: string;
    legalName: string;
    tradeName?: string;
    email?: string;
    phone?: string;
    salespersonId?: string;
    defaultPaymentTerms?: string;
    creditLimitCents?: number;
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
      `INSERT INTO party.customers (party_id, salesperson_id, default_payment_terms, credit_limit_cents)
       VALUES ($1, $2, $3, $4)`,
      [
        partyId,
        data.salespersonId ?? null,
        data.defaultPaymentTerms ?? null,
        data.creditLimitCents ?? 0,
      ],
    );
    return getCustomer(partyId, organizationId);
  });
}

export async function updateCustomer(
  id: string,
  orgId: string | undefined,
  data: Partial<{
    legalName: string;
    tradeName: string;
    email: string;
    phone: string;
    salespersonId: string;
    defaultPaymentTerms: string;
    creditLimitCents: number;
    isActive: boolean;
  }>,
) {
  await getCustomer(id, orgId);
  const organizationId = await resolveOrgId(orgId);
  return withTransaction(async (client) => {
    if (data.legalName || data.tradeName || data.email || data.phone) {
      await client.query(
        `UPDATE party.parties SET
           legal_name = COALESCE($2, legal_name),
           trade_name = COALESCE($3, trade_name),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           updated_at = now()
         WHERE id = $1`,
        [id, data.legalName, data.tradeName, data.email, data.phone],
      );
    }
    await client.query(
      `UPDATE party.customers SET
         salesperson_id = COALESCE($2, salesperson_id),
         default_payment_terms = COALESCE($3, default_payment_terms),
         credit_limit_cents = COALESCE($4, credit_limit_cents),
         is_active = COALESCE($5, is_active)
       WHERE party_id = $1`,
      [id, data.salespersonId, data.defaultPaymentTerms, data.creditLimitCents, data.isActive],
    );
    return getCustomer(id, organizationId);
  });
}

export async function deleteCustomer(id: string, orgId?: string) {
  await getCustomer(id, orgId);
  await pool.query(`UPDATE party.parties SET deleted_at = now() WHERE id = $1`, [id]);
}

export async function lookupCustomerCnpj(cnpj: string) {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) throw badRequest("CNPJ inválido.");
  return lookupCnpj(digits, env.cnpjProvider);
}

export async function listCustomerAddresses(customerId: string, orgId?: string) {
  await getCustomer(customerId, orgId);
  const result = await pool.query(
    `SELECT * FROM party.addresses
     WHERE party_id = $1 AND deleted_at IS NULL
     ORDER BY is_default_shipping DESC, label`,
    [customerId],
  );
  return result.rows;
}

export async function createCustomerAddress(
  customerId: string,
  orgId: string | undefined,
  data: {
    label?: string;
    isDefaultShipping?: boolean;
    isDefaultBilling?: boolean;
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    ibgeCode?: string;
  },
) {
  await getCustomer(customerId, orgId);
  if (data.zipCode && data.zipCode.replace(/\D/g, "").length === 8) {
    const cep = await lookupCep(data.zipCode, env.cepProvider);
    data = {
      ...data,
      street: data.street ?? cep.street,
      district: data.district ?? cep.district,
      city: data.city ?? cep.city,
      state: data.state ?? cep.state,
      ibgeCode: data.ibgeCode ?? cep.ibgeCode,
    };
  }
  const result = await pool.query(
    `INSERT INTO party.addresses
       (party_id, label, is_default_shipping, is_default_billing, zip_code, street, number,
        complement, district, city, state, country, ibge_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      customerId,
      data.label ?? "principal",
      data.isDefaultShipping ?? false,
      data.isDefaultBilling ?? false,
      data.zipCode ?? null,
      data.street ?? null,
      data.number ?? null,
      data.complement ?? null,
      data.district ?? null,
      data.city ?? null,
      data.state ?? null,
      data.country ?? "BR",
      data.ibgeCode ?? null,
    ],
  );
  return result.rows[0];
}

export async function lookupCepPublic(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) throw badRequest("CEP inválido.");
  return lookupCep(digits, env.cepProvider);
}
