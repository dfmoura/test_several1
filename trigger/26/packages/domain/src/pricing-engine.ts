import type { PriceTables, QuoteSpec, TierResult } from "./types.js";

/** Excel CEILING(number, significance) — always rounds away from zero toward +∞ for positives. */
export function excelCeiling(value: number, significance: number): number {
  if (significance === 0) return value;
  return Math.ceil(value / significance - Number.EPSILON) * significance;
}

function colorsKey(colors: number | "4V"): string {
  return String(colors);
}

function wastePaperM2(spec: QuoteSpec, tables: PriceTables): number {
  const key = colorsKey(spec.colors);
  const c = spec.colors;
  if (c === 4) {
    return ((spec.paperWidthCm + 1) / 100) * 180;
  }
  if (c === "4V" || c === 5) {
    return (spec.paperWidthCm / 100) * 250;
  }
  if (typeof c === "number" && c >= 6 && c <= 8) {
    const ml = c === 6 ? 260 : c === 7 ? 270 : 280;
    return (spec.paperWidthCm / 100) * ml;
  }
  return tables.wastePaperByColors[key] ?? 0;
}

function reelWasteM2(linearMeters: number, spec: QuoteSpec): number {
  if (linearMeters <= 1000) return 0;
  return ((5 * (spec.paperWidthCm - 0.75) * spec.columnsQty) / 100) * (linearMeters / 1000);
}

function reelChangeHours(linearMeters: number): number {
  if (linearMeters < 1000) return 0;
  return (((linearMeters / 1000) - 1) * 5) / 60;
}

function lookupBoxes(tables: PriceTables, tubeSize: string, rolls: number): number {
  const key = `${tubeSize}${rolls}`;
  if (tables.boxByTubeAndRolls[key] != null) return tables.boxByTubeAndRolls[key];
  // fallback: ~12 rolos por caixa (padrão 3" da planilha)
  return Math.max(1, Math.ceil(rolls / 12));
}

function machineHourlyRate(tables: PriceTables, group: string, colors: number | "4V"): number {
  const groupRates = tables.machineHourRates[group];
  if (!groupRates) {
    throw new Error(`Grupo de máquina sem taxa: ${group}`);
  }
  const rate = groupRates[colorsKey(colors)];
  if (rate == null) {
    throw new Error(`Taxa hora máquina ausente: ${group} / cores ${colors}`);
  }
  return rate;
}

/** Fórmula MATRIZ da planilha: ((((Z*3.175)/10)+4)*(larguraPapel*colunas+4)*cores)*valorCm2 */
export function calculateMatrixRaw(
  repeatZ: number,
  paperWidthCm: number,
  columnsQty: number,
  colors: number | "4V",
  pricePerCm2: number,
): number {
  if (repeatZ < 1) return 0;
  const colorCount = colors === "4V" ? 4 : Number(colors);
  const plateWidth = paperWidthCm * columnsQty;
  return (((((repeatZ * 3.175) / 10) + 4) * (plateWidth + 4) * colorCount) * pricePerCm2);
}

function calculateTier(spec: QuoteSpec, quantity: number, tables: PriceTables): TierResult {
  const linearMeters = (spec.pullCm / 100) * quantity / spec.columnsQty;
  const areaM2 = excelCeiling((quantity * spec.paperWidthCm * spec.pullCm) / 10000, 0.1);
  const wasteSetup = wastePaperM2(spec, tables);
  const wasteFinish = tables.wasteFinishByName[spec.finishName] ?? 0;
  const wasteReel = reelWasteM2(linearMeters, spec);

  const machineHours = linearMeters / spec.rpm + 1;
  const changeoverHours = 0; // SEM PARADA → 0; outros modos: fase B
  const reelHours = reelChangeHours(linearMeters);

  const rolls = quantity / spec.labelsPerRoll;
  const boxes = lookupBoxes(tables, spec.tubeSize, Math.round(rolls));

  const paperPrice = tables.paperPrices[spec.paperName];
  if (paperPrice == null) throw new Error(`Papel sem preço: ${spec.paperName}`);

  const finishPrice = tables.finishPrices[spec.finishName];
  if (finishPrice == null) throw new Error(`Acabamento sem preço: ${spec.finishName}`);

  const tubePrice = tables.tubePrices[spec.tubeSize];
  if (tubePrice == null) throw new Error(`Tubete sem preço: ${spec.tubeSize}`);

  const hourly = machineHourlyRate(tables, spec.machineCostGroup, spec.colors);

  const paperAreaBillable =
    areaM2 + wasteSetup + (typeof wasteReel === "number" ? wasteReel : 0);
  const costPaper = paperAreaBillable * paperPrice;
  const costMachine = hourly * machineHours;
  const costChangeover = hourly * changeoverHours;
  const costReelChange = hourly * reelHours;

  const inkBaseArea = areaM2 + wasteSetup;
  let costInk = 0;
  if (spec.colors !== 0) {
    const colorCount = spec.colors === "4V" ? 4 : Number(spec.colors);
    costInk =
      inkBaseArea <= tables.ink.thresholdM2
        ? colorCount * tables.ink.priceUnderPerColor
        : inkBaseArea * tables.ink.pricePerM2Over;
  }

  const costFinish = finishPrice * (areaM2 + wasteSetup + wasteFinish);
  const rewindColumns = spec.rewindColumns ?? 1;
  const costRewind =
    (((linearMeters * spec.columnsQty) / rewindColumns) / 1000) * tables.rewindRate;
  const costTube = rolls * tubePrice;
  const costBox = boxes * tables.boxUnitPrice;

  const service =
    costPaper +
    costMachine +
    costChangeover +
    costReelChange +
    costInk +
    costFinish +
    costRewind +
    costTube +
    costBox;

  const commission = service * (spec.commissionPercent / 100);
  const tax = service * (spec.taxPercent / 100);
  const totalBeforeRound = service + commission + tax;
  const labelPrice = excelCeiling(totalBeforeRound, 10);

  let matrixRaw = 0;
  let matrixPrice = 0;
  if (spec.usesMatrix && spec.firstOrderMatrix) {
    matrixRaw = calculateMatrixRaw(
      spec.repeatZ ?? 0,
      spec.paperWidthCm,
      spec.columnsQty,
      spec.colors,
      tables.matrixPricePerCm2,
    );
    matrixPrice = excelCeiling(matrixRaw, 1);
  }

  return {
    quantity,
    linearMeters,
    areaM2,
    wastes: { setup: wasteSetup, finish: wasteFinish, reel: wasteReel },
    rolls,
    boxes,
    hours: { machine: machineHours, changeover: changeoverHours, reelChange: reelHours },
    costs: {
      paper: costPaper,
      machine: costMachine,
      changeover: costChangeover,
      reelChange: costReelChange,
      ink: costInk,
      finish: costFinish,
      rewind: costRewind,
      tube: costTube,
      box: costBox,
      service,
      commission,
      tax,
    },
    labelPrice,
    matrixPrice,
    totalPrice: labelPrice + matrixPrice,
    totalBeforeRound,
    breakdown: {
      matrixRaw,
      paperPrice,
      finishPrice,
      tubePrice,
      hourly,
      changeoverMode: spec.changeoverMode,
    },
  };
}

export class SpreadsheetPricingEngine {
  calculate(spec: QuoteSpec, quantities: number[], tables: PriceTables): TierResult[] {
    return quantities.map((q) => calculateTier(spec, q, tables));
  }
}

export function buildBoxLookupForTube(
  tubeSize: string,
  maxRolls = 120,
  rollsPerBox = 12,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (let rolls = 1; rolls <= maxRolls; rolls++) {
    out[`${tubeSize}${rolls}`] = Math.ceil(rolls / rollsPerBox);
  }
  return out;
}
