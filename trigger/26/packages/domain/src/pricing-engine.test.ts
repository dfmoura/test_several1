import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OFFICIAL_2026_07_17_TABLES } from "./banca-do-dinei.tables.js";
import { SpreadsheetPricingEngine } from "./pricing-engine.js";
import type { QuoteSpec } from "./types.js";

/** Caso dourado: BANCA DO DINEI — ORÇAMENTO OFICIAL 2607171006.xlsm */
const BANCA_DO_DINEI: QuoteSpec = {
  measureLabel: "5,0X2,5",
  paperWidthCm: 7.5,
  pullCm: 2.72749,
  colors: 1,
  paperName: "BOPP BRILHO",
  finishName: "COLD STAMP + COLA",
  modelsQty: 1,
  columnsQty: 2,
  labelsPerRoll: 1000,
  tubeSize: '3"',
  dieKind: "ESPECIAL",
  repeatZ: 43,
  rewindColumns: 1,
  machineCostGroup: "MODULAR",
  rpm: 1300,
  changeoverMode: "SEM PARADA",
  taxPercent: 16,
  commissionPercent: 5,
  usesMatrix: true,
  firstOrderMatrix: true,
};

const EXPECTED = [
  { qty: 10000, label: 550, matrix: 94 },
  { qty: 20000, label: 850, matrix: 94 },
  { qty: 40000, label: 1450, matrix: 94 },
  { qty: 60000, label: 2040, matrix: 94 },
];

describe("SpreadsheetPricingEngine — Banca do Dinei", () => {
  const engine = new SpreadsheetPricingEngine();

  it("reproduz totais ceiling da planilha", () => {
    const tiers = engine.calculate(
      BANCA_DO_DINEI,
      EXPECTED.map((e) => e.qty),
      OFFICIAL_2026_07_17_TABLES,
    );

    for (let i = 0; i < EXPECTED.length; i++) {
      assert.equal(tiers[i].labelPrice, EXPECTED[i].label, `label qty=${EXPECTED[i].qty}`);
      assert.equal(tiers[i].matrixPrice, EXPECTED[i].matrix, `matrix qty=${EXPECTED[i].qty}`);
      assert.equal(
        tiers[i].totalPrice,
        EXPECTED[i].label + EXPECTED[i].matrix,
        `total qty=${EXPECTED[i].qty}`,
      );
    }
  });

  it("bate metragem e m² da planilha (10k)", () => {
    const [tier] = engine.calculate(BANCA_DO_DINEI, [10000], OFFICIAL_2026_07_17_TABLES);
    assert.ok(Math.abs(tier.linearMeters - 136.3745) < 0.001);
    assert.equal(tier.areaM2, 20.5);
    assert.equal(tier.wastes.setup, 4);
    assert.equal(tier.wastes.finish, 5);
    assert.equal(tier.rolls, 10);
    assert.equal(tier.boxes, 1);
  });
});
