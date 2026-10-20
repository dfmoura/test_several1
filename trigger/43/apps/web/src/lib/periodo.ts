/** Intervalo De/Até das listagens — contrato alinhado à API (`de` / `ate`). */

export type PeriodoRange = { de: string; ate: string };

/** Primeiro e último dia do mês civil no fuso local do browser. */
export function currentMonthRange(now: Date = new Date()): PeriodoRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const mm = String(m + 1).padStart(2, '0');
  const last = new Date(y, m + 1, 0).getDate();

  return {
    de: `${y}-${mm}-01`,
    ate: `${y}-${mm}-${String(last).padStart(2, '0')}`,
  };
}

export function appendPeriodo(params: URLSearchParams, de?: string, ate?: string): void {
  const d = de?.trim();
  const a = ate?.trim();
  if (d) params.set('de', d);
  if (a) params.set('ate', a);
}

export function hasPeriodo(de?: string, ate?: string): boolean {
  return Boolean(de?.trim() || ate?.trim());
}
