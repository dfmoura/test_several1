/**
 * Funções matemáticas alinhadas ao Excel.
 * CEILING(number, significance) — arredonda para cima no múltiplo.
 */

export function ceiling(value: number, significance: number): number {
  if (significance === 0) return value;
  if (!Number.isFinite(value) || !Number.isFinite(significance)) {
    throw new Error(`ceiling: valores inválidos (${value}, ${significance})`);
  }
  const sign = Math.sign(significance) || 1;
  const sig = Math.abs(significance);
  // Evita erro de ponto flutuante (ex.: 20.455 → 20.5)
  const scaled = value / sig;
  const eps = 1e-10;
  const ceiled = Math.ceil(scaled - eps);
  // Corrige artefatos tipo 122.80000000000001
  return Number((ceiled * sig * sign).toPrecision(12));
}

export function roundMoney(value: number, digits = 10): number {
  return Number(value.toPrecision(digits + 2));
}

export function nearlyEqual(a: number, b: number, absTol = 0.01): boolean {
  return Math.abs(a - b) <= absTol;
}
