import { formatCurrency, formatQty, formatQtyCompact } from './format';
import { formatVolumeDimensao } from './volumeEtiquetaPrint';

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

/** Identidade do SKU no Buscar do Consolidado (código · nome · família · grupo). */
export type ProdutoBuscaConsolidado = {
  codigo?: string | null;
  descricao_comercial?: string | null;
  descricao_fiscal?: string | null;
  familia?: string | null;
  grupo?: string | null;
  grupo_catalogo?: { codigo?: string | null; nome?: string | null } | null;
} | null | undefined;

/** Faixa de volume (qtde/vol · L×C) — mesma chave de `volumes_por_qtde`. */
export type FaixaBuscaVolume = {
  qtde?: string | null;
  unidade?: string | null;
  largura_mm?: string | null;
  comprimento_m?: string | null;
} | null | undefined;

export function textoBuscaProdutoEstoque(produto: ProdutoBuscaConsolidado): string {
  return textoBusca(
    produto?.codigo,
    produto?.descricao_comercial,
    produto?.descricao_fiscal,
    produto?.familia,
    estoqueGrupoCodigo(produto),
    produto?.grupo_catalogo?.nome,
  );
}

/**
 * Texto de busca da faixa: qtde formatada + bruta, unidade, L×C formatada e compacta.
 * Permite digitar "210", "1000", "210x1000" ou o trecho exibido na coluna Dimensão.
 */
export function textoBuscaFaixaVolume(faixa: FaixaBuscaVolume): string {
  if (!faixa) return '';
  const L = faixa.largura_mm ?? null;
  const C = faixa.comprimento_m ?? null;
  const dimCompact = L && C ? `${L}x${C} ${L}×${C}` : L ? String(L) : '';
  return textoBusca(
    formatQtyCompact(faixa.qtde),
    faixa.qtde,
    faixa.unidade,
    formatVolumeDimensao(L, C),
    dimCompact,
    L,
    C,
  );
}

/** Uma linha do Consolidado (SKU + faixa opcional) bate no Buscar. */
export function coincideLinhaConsolidado(
  produto: ProdutoBuscaConsolidado,
  faixa: FaixaBuscaVolume,
  q: string,
): boolean {
  return coincideBusca(
    textoBusca(textoBuscaProdutoEstoque(produto), textoBuscaFaixaVolume(faixa)),
    q,
  );
}

/** SKU entra no Consolidado se o produto ou qualquer faixa bater no Buscar. */
export function coincideSaldoConsolidado(
  s: {
    produto?: ProdutoBuscaConsolidado;
    volumes_por_qtde?: FaixaBuscaVolume[] | null;
  },
  q: string,
): boolean {
  if (!q.trim()) return true;
  if (coincideLinhaConsolidado(s.produto, null, q)) return true;
  for (const faixa of s.volumes_por_qtde ?? []) {
    if (coincideLinhaConsolidado(s.produto, faixa, q)) return true;
  }
  return false;
}

/** Compara qtde de estoque (4 casas) — consolidado volumes por faixa. */
export function mesmaQtdeEstoque(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
  return Math.abs(na - nb) < 0.00005;
}

/** L×C real do volume — chave da faixa consolidada (Exact). */
export function mesmaDimensaoVolume(
  a: { largura_mm?: string | null; comprimento_m?: string | null },
  b: { largura_mm?: string | null; comprimento_m?: string | null },
): boolean {
  return (a.largura_mm ?? null) === (b.largura_mm ?? null)
    && (a.comprimento_m ?? null) === (b.comprimento_m ?? null);
}

/** Ordem canônica das famílias na guia Consolidado (igual cadastro de produtos). */
export const ESTOQUE_FAMILIAS_ORDEM = ['MP', 'EMB', 'REV', 'MUC', 'PA', 'SVC', 'FAC'] as const;

/** Grupo do SKU para abas do consolidado (código estável). */
export function estoqueGrupoCodigo(produto: {
  grupo?: string | null;
  grupo_catalogo?: { codigo?: string | null } | null;
} | null | undefined): string {
  const g = produto?.grupo?.trim() || produto?.grupo_catalogo?.codigo?.trim();
  return g || '—';
}

/** Nome amigável do grupo (catálogo) ou o próprio código. */
export function estoqueGrupoLabel(produto: {
  grupo?: string | null;
  grupo_catalogo?: { codigo?: string | null; nome?: string | null } | null;
} | null | undefined): string {
  const codigo = estoqueGrupoCodigo(produto);
  const nome = produto?.grupo_catalogo?.nome?.trim();
  if (nome && codigo !== '—') return `${codigo} — ${nome}`;
  return codigo;
}
