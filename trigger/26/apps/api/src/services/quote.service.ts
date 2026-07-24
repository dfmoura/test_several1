import type { QuoteSpec } from "@reta/domain";
import type { DbClient } from "../db/pool.js";
import { pool, withTransaction } from "../db/pool.js";
import { nextDocNumber } from "../lib/doc-number.js";
import { emitOutboxEvent } from "../lib/outbox.js";
import { badRequest, notFound } from "../lib/errors.js";
import { calculatePricing, getCurrentPriceVersion } from "./pricing.service.js";
import { resolveOrgId } from "./org.service.js";

const DEFAULT_QUANTITIES = [10000, 20000, 40000, 60000];

type CreateQuoteInput = {
  customerId: string;
  salespersonId?: string;
  taxPercent?: number;
  commissionPercent?: number;
  machineId?: string;
  machineCostGroup?: string;
  usesMatrix?: boolean;
  firstOrderMatrix?: boolean;
  validUntil?: string;
  notes?: string;
  line: {
    description?: string;
    dieId?: string;
    measureLabel: string;
    paperWidthCm: number;
    pullCm: number;
    colors: number | "4V";
    paperItemId?: string;
    paperName: string;
    finishName: string;
    modelsQty?: number;
    columnsQty?: number;
    labelsPerRoll: number;
    tubeSize: string;
    dieKind?: string;
    repeatZ?: number;
    rewindColumns?: number;
    changeoverMode?: string;
    rpm: number;
  };
  quantities?: number[];
};

function buildSpec(quote: Record<string, unknown>, line: Record<string, unknown>): QuoteSpec {
  return {
    measureLabel: String(line.measure_label ?? ""),
    paperWidthCm: Number(line.paper_width_cm),
    pullCm: Number(line.pull_cm),
    colors: line.colors === "4V" ? "4V" : Number(line.colors),
    paperName: String(line.paper_name),
    finishName: String(line.finish_name),
    modelsQty: Number(line.models_qty ?? 1),
    columnsQty: Number(line.columns_qty ?? 1),
    labelsPerRoll: Number(line.labels_per_roll),
    tubeSize: String(line.tube_size),
    dieKind: line.die_kind ? String(line.die_kind) : undefined,
    repeatZ: line.repeat_z != null ? Number(line.repeat_z) : undefined,
    rewindColumns: line.rewind_columns != null ? Number(line.rewind_columns) : 1,
    machineCostGroup: String(quote.machine_cost_group ?? "MODULAR"),
    rpm: Number(line.rpm),
    changeoverMode: String(line.changeover_mode ?? "SEM PARADA"),
    taxPercent: Number(quote.tax_percent ?? 0),
    commissionPercent: Number(quote.commission_percent ?? 0),
    usesMatrix: Boolean(quote.uses_matrix),
    firstOrderMatrix: Boolean(quote.first_order_matrix ?? true),
  };
}

async function insertTiers(
  client: DbClient,
  lineId: string,
  spec: QuoteSpec,
  quantities: number[],
  orgId: string,
) {
  const tiers = await calculatePricing(spec, quantities, orgId);
  for (const t of tiers) {
    await client.query(
      `INSERT INTO commercial.quote_price_tiers
         (quote_line_id, quantity, linear_meters, area_m2, waste_setup_m2, waste_finish_m2,
          waste_reel_m2, rolls, boxes, machine_hours, cost_paper, cost_machine, cost_changeover,
          cost_reel_change, cost_ink, cost_finish, cost_rewind, cost_tube, cost_box, cost_service,
          commission_amount, tax_amount, total_before_round, label_price, matrix_price, total_price, breakdown)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
      [
        lineId,
        t.quantity,
        t.linearMeters,
        t.areaM2,
        t.wastes.setup,
        t.wastes.finish,
        t.wastes.reel,
        t.rolls,
        t.boxes,
        t.hours.machine,
        t.costs.paper,
        t.costs.machine,
        t.costs.changeover,
        t.costs.reelChange,
        t.costs.ink,
        t.costs.finish,
        t.costs.rewind,
        t.costs.tube,
        t.costs.box,
        t.costs.service,
        t.costs.commission,
        t.costs.tax,
        t.totalBeforeRound,
        t.labelPrice,
        t.matrixPrice,
        t.totalPrice,
        JSON.stringify(t.breakdown),
      ],
    );
  }
}

export async function listQuotes(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT id, number, customer_id, salesperson_id, status, quote_date, valid_until,
            tax_percent, commission_percent, created_at
     FROM commercial.quotes
     WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [organizationId],
  );
  return result.rows;
}

export async function getQuote(id: string, orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const quote = await pool.query(
    `SELECT * FROM commercial.quotes
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, organizationId],
  );
  if (!quote.rows[0]) throw notFound("Orçamento");
  const lines = await pool.query(
    `SELECT * FROM commercial.quote_lines WHERE quote_id = $1 ORDER BY line_no`,
    [id],
  );
  const tiers = await pool.query(
    `SELECT t.* FROM commercial.quote_price_tiers t
     JOIN commercial.quote_lines l ON l.id = t.quote_line_id
     WHERE l.quote_id = $1 ORDER BY t.quantity`,
    [id],
  );
  return { ...quote.rows[0], lines: lines.rows, tiers: tiers.rows };
}

export async function createQuote(orgId: string | undefined, input: CreateQuoteInput) {
  const organizationId = await resolveOrgId(orgId);
  const version = await getCurrentPriceVersion(organizationId);
  if (!version) throw badRequest("Nenhuma tabela de preços vigente cadastrada.");

  const quantities = input.quantities ?? DEFAULT_QUANTITIES;

  const quoteId = await withTransaction(async (client) => {
    const number = await nextDocNumber(client, organizationId, "quote");
    const quoteResult = await client.query(
      `INSERT INTO commercial.quotes
         (organization_id, number, customer_id, salesperson_id, status, valid_until,
          price_version_id, tax_percent, commission_percent, machine_id, machine_cost_group,
          uses_matrix, first_order_matrix, notes, snapshot)
       VALUES ($1,$2,$3,$4,'rascunho',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        organizationId,
        number,
        input.customerId,
        input.salespersonId ?? null,
        input.validUntil ?? null,
        version.id,
        input.taxPercent ?? 0,
        input.commissionPercent ?? 0,
        input.machineId ?? null,
        input.machineCostGroup ?? "MODULAR",
        input.usesMatrix ?? false,
        input.firstOrderMatrix ?? true,
        input.notes ?? null,
        JSON.stringify({ input, quantities }),
      ],
    );
    const quote = quoteResult.rows[0];
    const lineResult = await client.query(
      `INSERT INTO commercial.quote_lines
         (quote_id, line_no, description, die_id, measure_label, paper_width_cm, pull_cm, colors,
          paper_item_id, paper_name, finish_name, models_qty, columns_qty, labels_per_roll,
          tube_size, die_kind, repeat_z, rewind_columns, changeover_mode, rpm)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        quote.id,
        input.line.description ?? input.line.measureLabel,
        input.line.dieId ?? null,
        input.line.measureLabel,
        input.line.paperWidthCm,
        input.line.pullCm,
        String(input.line.colors),
        input.line.paperItemId ?? null,
        input.line.paperName,
        input.line.finishName,
        input.line.modelsQty ?? 1,
        input.line.columnsQty ?? 1,
        input.line.labelsPerRoll,
        input.line.tubeSize,
        input.line.dieKind ?? null,
        input.line.repeatZ ?? null,
        input.line.rewindColumns ?? 1,
        input.line.changeoverMode ?? "SEM PARADA",
        input.line.rpm,
      ],
    );
    const line = lineResult.rows[0];
    const spec = buildSpec(quote, line);
    await insertTiers(client, line.id as string, spec, quantities, organizationId);
    await emitOutboxEvent(client, "quote.created", "quote", quote.id as string, {
      number,
      customerId: input.customerId,
    });
    return quote.id as string;
  });

  // getQuote usa o pool global — só após COMMIT enxerga o registro.
  return getQuote(quoteId, organizationId);
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  rascunho: ["enviado", "cancelado"],
  enviado: ["aprovado", "reprovado", "expirado", "cancelado"],
};

export async function updateQuoteStatus(
  id: string,
  orgId: string | undefined,
  status: string,
) {
  const quote = await getQuote(id, orgId);
  const current = quote.status as string;
  const allowed = STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(status) && status !== "cancelado") {
    throw badRequest(`Transição inválida de '${current}' para '${status}'.`);
  }
  if (status === "enviar") status = "enviado";
  if (status === "aprovar") status = "aprovado";
  if (status === "reprovar") status = "reprovado";

  await pool.query(
    `UPDATE commercial.quotes SET status = $2, updated_at = now() WHERE id = $1`,
    [id, status],
  );
  return getQuote(id, orgId);
}

export async function approveQuote(
  id: string,
  orgId: string | undefined,
  selectedQuantity: number,
) {
  const quote = await getQuote(id, orgId);
  if (quote.status !== "enviado" && quote.status !== "rascunho" && quote.status !== "aprovado") {
    throw badRequest("Orçamento não pode ser aprovado neste status.");
  }
  const tier = (quote.tiers as Array<{ quantity: string }>).find(
    (t) => Number(t.quantity) === selectedQuantity,
  );
  if (!tier) throw badRequest("Faixa de quantidade não encontrada no orçamento.");

  return withTransaction(async (client) => {
    await client.query(
      `UPDATE commercial.quotes SET status = 'aprovado', updated_at = now(),
         snapshot = snapshot || $2::jsonb
       WHERE id = $1`,
      [id, JSON.stringify({ approvedQuantity: selectedQuantity })],
    );
    await emitOutboxEvent(client, "quote.approved", "quote", id, {
      selectedQuantity,
      readyForOrder: true,
    });
  });
  return getQuote(id, orgId);
}

export async function getApprovedTier(quoteId: string) {
  const quote = await getQuote(quoteId);
  const snap = quote.snapshot as { approvedQuantity?: number };
  if (!snap.approvedQuantity) throw badRequest("Orçamento sem quantidade aprovada.");
  const tier = (quote.tiers as Array<Record<string, unknown>>).find(
    (t) => Number(t.quantity) === snap.approvedQuantity,
  );
  if (!tier) throw badRequest("Faixa aprovada não encontrada.");
  return { quote, tier, quantity: snap.approvedQuantity };
}
