export type QuoteSpec = {
  measureLabel: string;
  paperWidthCm: number;
  pullCm: number;
  colors: number | "4V";
  paperName: string;
  finishName: string;
  modelsQty: number;
  columnsQty: number;
  labelsPerRoll: number;
  tubeSize: string;
  dieKind?: string;
  repeatZ?: number;
  rewindColumns?: number;
  machineCostGroup: string;
  rpm: number;
  changeoverMode: string;
  taxPercent: number;
  commissionPercent: number;
  usesMatrix: boolean;
  firstOrderMatrix: boolean;
};

export type PriceTables = {
  paperPrices: Record<string, number>;
  finishPrices: Record<string, number>;
  rewindRate: number;
  tubePrices: Record<string, number>;
  ink: { thresholdM2: number; priceUnderPerColor: number; pricePerM2Over: number };
  machineHourRates: Record<string, Record<string, number>>;
  wastePaperByColors: Record<string, number>;
  wasteFinishByName: Record<string, number>;
  /** boxes for key `${tubeSize}${rolls}` e.g. `3"10` */
  boxByTubeAndRolls: Record<string, number>;
  boxUnitPrice: number;
  matrixPricePerCm2: number;
};

export type TierResult = {
  quantity: number;
  linearMeters: number;
  areaM2: number;
  wastes: { setup: number; finish: number; reel: number };
  rolls: number;
  boxes: number;
  hours: { machine: number; changeover: number; reelChange: number };
  costs: {
    paper: number;
    machine: number;
    changeover: number;
    reelChange: number;
    ink: number;
    finish: number;
    rewind: number;
    tube: number;
    box: number;
    service: number;
    commission: number;
    tax: number;
  };
  labelPrice: number;
  matrixPrice: number;
  totalPrice: number;
  totalBeforeRound: number;
  breakdown: Record<string, unknown>;
};

export interface PricingEngine {
  calculate(spec: QuoteSpec, quantities: number[], tables: PriceTables): TierResult[];
}
