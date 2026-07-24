import {
  OFFICIAL_2026_07_17_TABLES,
  SpreadsheetPricingEngine,
  type PriceTables,
  type QuoteSpec,
} from "@reta/domain";
import { pool } from "../db/pool.js";
import { resolveOrgId } from "./org.service.js";

const engine = new SpreadsheetPricingEngine();

export async function getCurrentPriceVersion(orgId?: string) {
  const organizationId = await resolveOrgId(orgId);
  const result = await pool.query(
    `SELECT id, name, effective_from, effective_to, is_current, source_file, created_at
     FROM pricing.price_table_versions
     WHERE organization_id = $1 AND is_current = true
     ORDER BY effective_from DESC LIMIT 1`,
    [organizationId],
  );
  return result.rows[0] ?? null;
}

export async function getTablesSummary(orgId?: string) {
  const version = await getCurrentPriceVersion(orgId);
  if (!version) {
    return {
      source: "official_fallback",
      name: "OFICIAL 2026-07-17",
      paperCount: Object.keys(OFFICIAL_2026_07_17_TABLES.paperPrices).length,
      finishCount: Object.keys(OFFICIAL_2026_07_17_TABLES.finishPrices).length,
      machineGroups: Object.keys(OFFICIAL_2026_07_17_TABLES.machineHourRates),
    };
  }
  const counts = await pool.query<{ paper: string; finish: string; machines: string }>(
    `SELECT
       (SELECT count(*)::text FROM pricing.paper_prices WHERE version_id = $1) AS paper,
       (SELECT count(*)::text FROM pricing.finish_prices WHERE version_id = $1) AS finish,
       (SELECT count(*)::text FROM pricing.machine_hour_rates WHERE version_id = $1) AS machines`,
    [version.id],
  );
  return {
    source: "database",
    version,
    paperCount: Number(counts.rows[0]?.paper ?? 0),
    finishCount: Number(counts.rows[0]?.finish ?? 0),
    machineGroups: Number(counts.rows[0]?.machines ?? 0),
  };
}

export async function loadPriceTables(orgId?: string): Promise<PriceTables> {
  const version = await getCurrentPriceVersion(orgId);
  if (!version) return OFFICIAL_2026_07_17_TABLES;

  const versionId = version.id as string;
  const [papers, finishes, tubes, ink, machines, wastePaper, wasteFinish, boxes, matrix] =
    await Promise.all([
      pool.query(`SELECT name, price_per_m2 FROM pricing.paper_prices WHERE version_id = $1`, [
        versionId,
      ]),
      pool.query(`SELECT name, price, kind FROM pricing.finish_prices WHERE version_id = $1`, [
        versionId,
      ]),
      pool.query(`SELECT size_label, unit_price FROM pricing.tube_prices WHERE version_id = $1`, [
        versionId,
      ]),
      pool.query(
        `SELECT threshold_m2, price_under, price_per_m2_over FROM pricing.ink_rules WHERE version_id = $1 LIMIT 1`,
        [versionId],
      ),
      pool.query(
        `SELECT cost_group, colors_key, hourly_rate FROM pricing.machine_hour_rates WHERE version_id = $1`,
        [versionId],
      ),
      pool.query(`SELECT colors, waste_m2 FROM pricing.waste_paper_rules WHERE version_id = $1`, [
        versionId,
      ]),
      pool.query(
        `SELECT finish_name, waste_m2 FROM pricing.waste_finish_rules WHERE version_id = $1`,
        [versionId],
      ),
      pool.query(`SELECT tube_size, rolls, boxes FROM pricing.box_rules WHERE version_id = $1`, [
        versionId,
      ]),
      pool.query(
        `SELECT price_per_cm2 FROM pricing.matrix_rules WHERE version_id = $1 LIMIT 1`,
        [versionId],
      ),
    ]);

  if (papers.rows.length === 0) return OFFICIAL_2026_07_17_TABLES;

  const paperPrices: Record<string, number> = {};
  for (const r of papers.rows) paperPrices[r.name as string] = Number(r.price_per_m2);

  const finishPrices: Record<string, number> = {};
  let rewindRate = OFFICIAL_2026_07_17_TABLES.rewindRate;
  for (const r of finishes.rows) {
    if (r.kind === "rebobinacao") rewindRate = Number(r.price);
    else finishPrices[r.name as string] = Number(r.price);
  }

  const tubePrices: Record<string, number> = {};
  for (const r of tubes.rows) tubePrices[r.size_label as string] = Number(r.unit_price);

  const inkRow = ink.rows[0];
  const inkRules = inkRow
    ? {
        thresholdM2: Number(inkRow.threshold_m2),
        priceUnderPerColor: Number(inkRow.price_under),
        pricePerM2Over: Number(inkRow.price_per_m2_over),
      }
    : OFFICIAL_2026_07_17_TABLES.ink;

  const machineHourRates: Record<string, Record<string, number>> = {};
  for (const r of machines.rows) {
    const g = r.cost_group as string;
    if (!machineHourRates[g]) machineHourRates[g] = {};
    machineHourRates[g][r.colors_key as string] = Number(r.hourly_rate);
  }

  const wastePaperByColors: Record<string, number> = {};
  for (const r of wastePaper.rows) wastePaperByColors[String(r.colors)] = Number(r.waste_m2);

  const wasteFinishByName: Record<string, number> = {};
  for (const r of wasteFinish.rows)
    wasteFinishByName[r.finish_name as string] = Number(r.waste_m2);

  const boxByTubeAndRolls: Record<string, number> = {};
  for (const r of boxes.rows) {
    boxByTubeAndRolls[`${r.tube_size}${r.rolls}`] = Number(r.boxes);
  }

  const matrixPricePerCm2 = matrix.rows[0]
    ? Number(matrix.rows[0].price_per_cm2)
    : OFFICIAL_2026_07_17_TABLES.matrixPricePerCm2;

  return {
    paperPrices,
    finishPrices,
    rewindRate,
    tubePrices,
    ink: inkRules,
    machineHourRates,
    wastePaperByColors,
    wasteFinishByName,
    boxByTubeAndRolls,
    boxUnitPrice: OFFICIAL_2026_07_17_TABLES.boxUnitPrice,
    matrixPricePerCm2,
  };
}

export async function calculatePricing(
  spec: QuoteSpec,
  quantities: number[],
  orgId?: string,
) {
  const tables = await loadPriceTables(orgId);
  return engine.calculate(spec, quantities, tables);
}

export { engine };
