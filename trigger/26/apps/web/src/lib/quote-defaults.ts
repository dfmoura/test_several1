import type { QuoteSpec } from "./types";

/** Defaults do caso dourado Banca do Dinei — ORÇAMENTO OFICIAL 2607171006.xlsm */
export const BANCA_DO_DINEI_SPEC: QuoteSpec = {
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

export const DEFAULT_QUANTITIES = [10000, 20000, 40000, 60000];

export const PAPER_OPTIONS = [
  "BOPP BRILHO",
  "BOPP BRILHO BXT",
  "BOPP FOSCO",
  "BOPP FOSCO BXT",
  "BOPP PRATA",
  "COUCHE FASSON 20G",
  "TÉRMICO FASSON",
];

export const FINISH_OPTIONS = [
  "SEM ACABAMENTO",
  "VERNIZ",
  "LAMINAÇÃO FOSCA",
  "LAMINAÇÃO BRILHO",
  "COLD STAMP +VERNIZ",
  "COLD STAMP + COLA",
];

export const TUBE_OPTIONS = ['1"', '1" 1/2', '3"'];

export const MACHINE_GROUPS = ["MODULAR", "BETA / 160 / 250 / ETIRAMA", "BATIDA"];
