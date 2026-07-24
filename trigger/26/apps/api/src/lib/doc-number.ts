import type { DbClient } from "../db/pool.js";

const DOC_PREFIX: Record<string, string> = {
  quote: "QUOTE",
  order: "PED",
  wo: "OS",
  invoice: "NF",
  po: "PO",
};

export async function nextDocNumber(
  client: DbClient,
  organizationId: string,
  docType: string,
  year = new Date().getFullYear(),
): Promise<string> {
  const prefix = DOC_PREFIX[docType] ?? docType.toUpperCase();
  const result = await client.query<{ last_value: string }>(
    `INSERT INTO commercial.doc_sequences (organization_id, doc_type, year, last_value)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (organization_id, doc_type, year)
     DO UPDATE SET last_value = commercial.doc_sequences.last_value + 1
     RETURNING last_value`,
    [organizationId, docType, year],
  );
  const seq = Number(result.rows[0].last_value);
  return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
}
