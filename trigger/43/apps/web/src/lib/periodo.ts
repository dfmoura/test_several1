/** Intervalo De/Até das listagens — contrato alinhado à API (`de` / `ate`). */

export type PeriodoRange = { de: string; ate: string };

/** Presets das listagens operacionais (ORC/PED/OP/OC/FAT). */
export type PeriodoPreset = 'tudo' | 'ano_atual' | 'ano_anterior' | 'intervalo';

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

/**
 * Ano civil corrente (1º jan → 31 dez) — default das caixas DF-e / arquivo fiscal.
 * Norma: ADR_CAIXA_DFE_NFE_DESTINADAS (1ª hidratação = ano corrente).
 */
export function currentYearRange(now: Date = new Date()): PeriodoRange {
  const y = now.getFullYear();

  return {
    de: `${y}-01-01`,
    ate: `${y}-12-31`,
  };
}

/** Ano civil imediatamente anterior (1º jan → 31 dez). */
export function previousYearRange(now: Date = new Date()): PeriodoRange {
  const y = now.getFullYear() - 1;

  return {
    de: `${y}-01-01`,
    ate: `${y}-12-31`,
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

function sameRange(a: PeriodoRange, b: PeriodoRange): boolean {
  return a.de === b.de && a.ate === b.ate;
}

/** Infere o preset a partir do intervalo aplicado (vazio = tudo). */
export function resolvePeriodoPreset(de?: string, ate?: string, now: Date = new Date()): PeriodoPreset {
  const d = de?.trim() ?? '';
  const a = ate?.trim() ?? '';
  if (!d && !a) return 'tudo';
  const range = { de: d, ate: a };
  if (sameRange(range, currentYearRange(now))) return 'ano_atual';
  if (sameRange(range, previousYearRange(now))) return 'ano_anterior';
  return 'intervalo';
}

export function periodoPresetLabel(preset: PeriodoPreset): string {
  switch (preset) {
    case 'tudo':
      return 'Tudo';
    case 'ano_atual':
      return 'Ano atual';
    case 'ano_anterior':
      return 'Ano anterior';
    case 'intervalo':
      return 'Intervalo';
  }
}

/** Texto curto para aria/title do botão (sem jargão). */
export function periodoFiltroResumo(de?: string, ate?: string, now: Date = new Date()): string {
  const preset = resolvePeriodoPreset(de, ate, now);
  if (preset === 'tudo') return 'Período: tudo';
  if (preset === 'ano_atual') return `Período: ${now.getFullYear()}`;
  if (preset === 'ano_anterior') return `Período: ${now.getFullYear() - 1}`;
  const d = de?.trim() ?? '';
  const a = ate?.trim() ?? '';
  if (d && a) return `Período: ${d} → ${a}`;
  if (d) return `Período: desde ${d}`;
  if (a) return `Período: até ${a}`;
  return 'Período: intervalo';
}
