/** Regras espelhadas de EmpresaFiscalRules (UX; servidor é a fonte da verdade). */

export const EMPRESA_REGIMES = [
  'SIMPLES_NACIONAL',
  'MEI',
  'LUCRO_PRESUMIDO',
  'LUCRO_REAL',
] as const;

export type EmpresaRegime = (typeof EMPRESA_REGIMES)[number];

export const IE_STATUSES = [
  'NAO_VERIFICADA',
  'OK',
  'BAIXADA',
  'NAO_HABILITADA',
  'ISENTA',
] as const;

export function normalizeEmpresaRegime(regime: string | null | undefined): EmpresaRegime {
  const value = (regime ?? '').trim().toUpperCase();
  if (value === 'PRESUMIDO') return 'LUCRO_PRESUMIDO';
  if (value === 'REAL') return 'LUCRO_REAL';
  if ((EMPRESA_REGIMES as readonly string[]).includes(value)) {
    return value as EmpresaRegime;
  }
  return 'SIMPLES_NACIONAL';
}

/** CRT padrão do regime (sem sublimite). */
export function defaultCrtForRegime(regime: string | null | undefined): 1 | 2 | 3 | 4 {
  switch (normalizeEmpresaRegime(regime)) {
    case 'MEI':
      return 4;
    case 'LUCRO_PRESUMIDO':
    case 'LUCRO_REAL':
      return 3;
    default:
      return 1;
  }
}

export function allowedCrtsForRegime(regime: string | null | undefined): number[] {
  switch (normalizeEmpresaRegime(regime)) {
    case 'MEI':
      return [4];
    case 'LUCRO_PRESUMIDO':
    case 'LUCRO_REAL':
      return [3];
    default:
      return [1, 2];
  }
}

/**
 * Ao mudar o regime, recalcula CRT.
 * Preserva CRT=2 (sublimite) se o regime continuar Simples.
 */
export function syncCrtForForm(
  regime: string,
  crt: number,
  previousRegime?: string | null,
): number {
  const allowed = allowedCrtsForRegime(regime);
  if (
    normalizeEmpresaRegime(regime) === 'SIMPLES_NACIONAL' &&
    crt === 2 &&
    normalizeEmpresaRegime(previousRegime ?? regime) === 'SIMPLES_NACIONAL'
  ) {
    return 2;
  }
  if (allowed.includes(crt)) {
    return crt;
  }
  return defaultCrtForRegime(regime);
}

export function crtLabel(crt: number): string {
  const map: Record<number, string> = {
    1: '1 — Simples Nacional',
    2: '2 — Simples Nacional (sublimite)',
    3: '3 — Regime Normal',
    4: '4 — MEI',
  };
  return map[crt] ?? String(crt);
}

/** Validação local do DV do CNPJ (espelha servidor). */
export function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const calc = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Number(base[i]) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calc(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(digits[12])) return false;
  const d2 = calc(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === Number(digits[13]);
}
