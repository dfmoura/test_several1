/** Regras espelhadas de ParceiroFiscalRules (UX; servidor é a fonte da verdade). */

const UFS_AREA_INCENTIVADA = new Set(['AM', 'AC', 'RO', 'RR', 'AP']);

export function normalizeIe(ie: string | null | undefined): string {
  return (ie ?? '').trim().toUpperCase();
}

export function isIeIsento(ie: string | null | undefined): boolean {
  const n = normalizeIe(ie).replace(/\s+/g, ' ');
  return n === 'ISENTO' || n === 'ISENTA' || n === 'IE ISENTO' || n === 'IE ISENTA';
}

export function isIeNumerica(ie: string | null | undefined): boolean {
  const n = normalizeIe(ie);
  if (!n || isIeIsento(n)) return false;
  return /\d/.test(n);
}

/** 1=contribuinte · 2=isento · 9=não contribuinte */
export function deriveIndIeDest(ie: string | null | undefined): 1 | 2 | 9 {
  if (isIeIsento(ie)) return 2;
  if (isIeNumerica(ie)) return 1;
  return 9;
}

export function indIeDestLabel(ind: number): string {
  if (ind === 1) return '1 — Contribuinte ICMS';
  if (ind === 2) return '2 — Contribuinte isento';
  return '9 — Não contribuinte';
}

export function suggestAreaIncentivada(uf: string | null | undefined, suframa?: string | null): boolean {
  if ((suframa ?? '').trim() !== '') return true;
  const u = (uf ?? '').trim().toUpperCase();
  return UFS_AREA_INCENTIVADA.has(u);
}

export function ieStatusLabel(status: string): string {
  const map: Record<string, string> = {
    NAO_VERIFICADA: 'Não verificada',
    OK: 'OK (habilitada)',
    BAIXADA: 'Baixada',
    NAO_HABILITADA: 'Não habilitada',
    ISENTA: 'Isenta',
  };
  return map[status] ?? status;
}

export function finalidadeLabel(value: string): string {
  const map: Record<string, string> = {
    REVENDA: 'Revenda',
    INDUSTRIALIZACAO: 'Industrialização / insumo',
    USO_CONSUMO: 'Uso e consumo',
  };
  return map[value] ?? value;
}

export function regimeLabel(value: string): string {
  const map: Record<string, string> = {
    SIMPLES_NACIONAL: 'Simples Nacional',
    MEI: 'MEI',
    PRESUMIDO: 'Lucro Presumido',
    REAL: 'Lucro Real',
    ISENTO: 'Isento',
    OUTRO: 'Outro',
  };
  return map[value] ?? value;
}
