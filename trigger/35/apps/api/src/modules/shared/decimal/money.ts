import Decimal from 'decimal.js';

/** Dinheiro e quantidade: NUNCA number/float (PADRAO_DECIMAL_CALCULOS). */
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
});

export { Decimal };

export function money(value: string | number | Decimal): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function qty(value: string | number | Decimal, casas = 4): Decimal {
  return new Decimal(value).toDecimalPlaces(casas, Decimal.ROUND_HALF_UP);
}

export function moneyToString(value: Decimal): string {
  return money(value).toFixed(2);
}

export function qtyToString(value: Decimal, casas = 4): string {
  return qty(value, casas).toFixed(casas);
}

export function assertNonNegativeMoney(value: Decimal, field = 'valor'): void {
  if (value.isNegative()) {
    throw new Error(`${field} não pode ser negativo`);
  }
}
