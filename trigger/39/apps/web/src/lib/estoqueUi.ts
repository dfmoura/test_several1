import { formatCurrency, formatQty } from './format';

/** Sentido do MOV para leitura do kardex — estudo 32: nada some sem documento. */
export type MovSentido = 'entrada' | 'saida' | 'ajuste';

const MOV_TIPO_LABELS: Record<string, string> = {
  ENTRADA_COMPRA: 'Entrada de compra',
  SAIDA_PRODUCAO: 'Saída para produção',
  ENTRADA_SOBRA: 'Retorno de sobra',
  ENTRADA_PA: 'Entrada de acabado',
  AJUSTE: 'Ajuste',
};

const AJU_ORIGEM_LABELS: Record<string, string> = {
  CONTAGEM_AVULSA: 'Contagem avulsa',
  INV_ROTATIVO: 'Inventário rotativo',
  INV_GERAL: 'Inventário geral',
  VIRADA: 'Virada',
};

const AJU_ALCADA_LABELS: Record<string, string> = {
  LIDER: 'Líder',
  GESTOR: 'Gestor',
  DIRECAO: 'Direção',
};

const LOTE_ORIGEM_LABELS: Record<string, string> = {
  ENTRADA_COMPRA: 'Entrada de compra',
  AJUSTE: 'Ajuste',
  VIRADA: 'Virada',
  BACKFILL: 'Abertura',
  PRODUCAO: 'Produção',
};

export function movTipoLabel(tipo: string | null | undefined): string {
  if (!tipo) return '—';
  return MOV_TIPO_LABELS[tipo] ?? tipo.replace(/_/g, ' ');
}

export function movSentido(tipo: string | null | undefined): MovSentido {
  switch (tipo) {
    case 'SAIDA_PRODUCAO':
      return 'saida';
    case 'AJUSTE':
      return 'ajuste';
    default:
      return 'entrada';
  }
}

export function ajuOrigemLabel(origem: string | null | undefined): string {
  if (!origem) return '—';
  return AJU_ORIGEM_LABELS[origem] ?? origem.replace(/_/g, ' ');
}

export function ajuAlcadaLabel(alcada: string | null | undefined): string {
  if (!alcada) return '—';
  return AJU_ALCADA_LABELS[alcada] ?? alcada.replace(/_/g, ' ');
}

export function loteOrigemLabel(origem: string | null | undefined): string {
  if (!origem) return '—';
  return LOTE_ORIGEM_LABELS[origem] ?? origem.replace(/_/g, ' ');
}

/** qtde × custo médio — só apresentação; saldo oficial continua no MOV. */
export function valorPosicao(
  qtde: string | number | null | undefined,
  custoMedio: string | number | null | undefined,
): number | null {
  const q = Number(qtde);
  const c = Number(custoMedio);
  if (!Number.isFinite(q) || !Number.isFinite(c)) return null;
  return q * c;
}

export function formatValorPosicao(
  qtde: string | number | null | undefined,
  custoMedio: string | number | null | undefined,
): string {
  const v = valorPosicao(qtde, custoMedio);
  if (v == null) return '—';
  return formatCurrency(v.toFixed(2));
}

export function somaValorPosicao(
  rows: Array<{ qtde: string | number; custo_medio: string | number }>,
): string {
  let acc = 0;
  for (const row of rows) {
    const v = valorPosicao(row.qtde, row.custo_medio);
    if (v != null) acc += v;
  }
  return formatCurrency(acc.toFixed(2));
}

/**
 * Quantidade no kardex: entrada +, saída −.
 * AJU guarda qtde absoluta no item — sem inventar o sinal.
 */
export function qtdeKardex(
  tipo: string | null | undefined,
  qtde: string,
  unidade?: string | null,
): { className: string; text: string } {
  const n = formatQty(qtde);
  const u = unidade ? ` ${unidade}` : '';
  const sentido = movSentido(tipo);
  if (sentido === 'entrada') return { className: 'qty-in', text: `+${n}${u}` };
  if (sentido === 'saida') return { className: 'qty-out', text: `−${n}${u}` };
  return { className: 'qty-adj', text: `${n}${u}` };
}

export function textoBusca(...parts: Array<string | number | null | undefined>): string {
  return parts
    .map((p) => (p == null ? '' : String(p)))
    .join(' ')
    .toLowerCase();
}

export function coincideBusca(haystack: string, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystack.includes(needle);
}
