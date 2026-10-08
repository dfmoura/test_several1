import { clampDecimalScale, DECIMAL_SCALE, formatCurrency, formatQty, formatQtyCompact } from './format';
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

/** Ordem canônica das famílias no filtro da posição (igual cadastro de produtos). */
export const ESTOQUE_FAMILIAS_ORDEM = ['MP', 'EMB', 'REV', 'MUC', 'PA', 'SVC', 'FAC'] as const;

export type LocalPosicao = {
  key: string;
  enderecoId: number | null;
  codigo: string | null;
  volumes: number;
  qtde: string;
};

export type FormatoPosicao = {
  key: string;
  qtde: string;
  unidade: string;
  largura_mm: string | null;
  comprimento_m: string | null;
  volumes: number;
  locais: LocalPosicao[];
};

type LotePosicao = {
  qtde?: string | number | null;
  largura_mm?: string | null;
  comprimento_m?: string | null;
  endereco_id?: number | null;
  endereco?: { id: number; codigo: string } | null;
};

export type ItemPosicao = {
  saldo: {
    id: number;
    produto_id: number;
    produto?: ProdutoBuscaConsolidado;
    qtde: string;
    unidade: string;
    controla_lote?: boolean;
    local?: { id: number; codigo: string; nome?: string | null } | null;
    lotes_count?: number;
    volumes_por_qtde?: Array<
      FaixaBuscaVolume & { volumes?: number; unidade?: string | null }
    > | null;
    saldos_por_dimensao?: Array<{
      qtde: string;
      volumes: number;
      unidade?: string | null;
      largura_mm?: string | null;
      comprimento_m?: string | null;
      locais?: Array<{
        endereco_id?: number | null;
        codigo?: string | null;
        qtde: string;
        volumes: number;
      }>;
    }> | null;
    lotes?: LotePosicao[] | null;
  };
  formatos: FormatoPosicao[];
};

function loteComSaldo(qtde: string | number | null | undefined): boolean {
  const n = Number(qtde);
  return Number.isFinite(n) && n > 0;
}

function somaQtdeEstoque(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): string {
  const na = Number(a);
  const nb = Number(b);
  const n = (Number.isFinite(na) ? na : 0) + (Number.isFinite(nb) ? nb : 0);
  return clampDecimalScale(n.toFixed(DECIMAL_SCALE.qty), DECIMAL_SCALE.qty) || '0.0000';
}

function chaveDimensao(l: { largura_mm?: string | null; comprimento_m?: string | null }): string {
  return `${l.largura_mm ?? ''}|${l.comprimento_m ?? ''}`;
}

function chaveLocal(lote: LotePosicao): { key: string; enderecoId: number | null; codigo: string | null } {
  const id = lote.endereco_id ?? lote.endereco?.id ?? null;
  const codigo = lote.endereco?.codigo?.trim() || null;
  return { key: id != null ? `e-${id}` : 'sem-local', enderecoId: id, codigo };
}

function ordenaLocais(a: LocalPosicao, b: LocalPosicao): number {
  if (a.codigo == null && b.codigo != null) return 1;
  if (a.codigo != null && b.codigo == null) return -1;
  return (a.codigo ?? '').localeCompare(b.codigo ?? '', 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
}

function textoBuscaLocais(locais: LocalPosicao[]): string {
  return textoBusca(
    ...locais.map((l) => l.codigo),
    ...locais.map((l) => l.qtde),
    locais.some((l) => l.codigo == null) ? 'sem local' : '',
  );
}

function formatoPassaBusca(
  s: ItemPosicao['saldo'],
  fmt: FormatoPosicao,
  q: string,
): boolean {
  const produtoBate = coincideLinhaConsolidado(s.produto, null, q);
  return (
    produtoBate ||
    coincideLinhaConsolidado(s.produto, {
      qtde: fmt.qtde,
      unidade: fmt.unidade,
      largura_mm: fmt.largura_mm,
      comprimento_m: fmt.comprimento_m,
    }, q) ||
    coincideBusca(textoBuscaLocais(fmt.locais), q)
  );
}

function formatosDaApi(s: ItemPosicao['saldo'], q: string): FormatoPosicao[] {
  const out: FormatoPosicao[] = [];
  for (const row of s.saldos_por_dimensao ?? []) {
    if (!loteComSaldo(row.qtde)) continue;
    const fmt: FormatoPosicao = {
      key: `f-${s.id}-${chaveDimensao(row)}`,
      qtde: row.qtde,
      unidade: row.unidade ?? s.unidade,
      largura_mm: row.largura_mm ?? null,
      comprimento_m: row.comprimento_m ?? null,
      volumes: row.volumes,
      locais: (row.locais ?? []).map((local) => ({
        key: local.endereco_id != null ? `e-${local.endereco_id}` : 'sem-local',
        enderecoId: local.endereco_id ?? null,
        codigo: local.codigo?.trim() || null,
        volumes: local.volumes,
        qtde: local.qtde,
      })),
    };
    fmt.locais.sort(ordenaLocais);
    if (formatoPassaBusca(s, fmt, q)) out.push(fmt);
  }
  return out;
}

/**
 * Posição: produto + dimensão (L×C) → soma das qtdes dos volumes.
 * Prefere `saldos_por_dimensao` (bcmath). Fallback: agrupa lotes no cliente.
 */
function formatosDoSaldo(s: ItemPosicao['saldo'], q: string): FormatoPosicao[] {
  if (s.saldos_por_dimensao != null) {
    return formatosDaApi(s, q);
  }

  const map = new Map<string, FormatoPosicao>();

  for (const lote of s.lotes ?? []) {
    if (!loteComSaldo(lote.qtde)) continue;
    const dimKey = chaveDimensao(lote);
    let fmt = map.get(dimKey);
    if (!fmt) {
      fmt = {
        key: `f-${s.id}-${dimKey}`,
        qtde: '0.0000',
        unidade: s.unidade,
        largura_mm: lote.largura_mm ?? null,
        comprimento_m: lote.comprimento_m ?? null,
        volumes: 0,
        locais: [],
      };
      map.set(dimKey, fmt);
    }
    const qtdeLote = String(lote.qtde);
    fmt.qtde = somaQtdeEstoque(fmt.qtde, qtdeLote);
    fmt.volumes += 1;

    const loc = chaveLocal(lote);
    const existente = fmt.locais.find((l) => l.key === loc.key);
    if (existente) {
      existente.volumes += 1;
      existente.qtde = somaQtdeEstoque(existente.qtde, qtdeLote);
    } else {
      fmt.locais.push({
        key: loc.key,
        enderecoId: loc.enderecoId,
        codigo: loc.codigo,
        volumes: 1,
        qtde: somaQtdeEstoque('0', qtdeLote),
      });
    }
  }

  const out: FormatoPosicao[] = [];
  for (const fmt of map.values()) {
    fmt.locais.sort(ordenaLocais);
    if (formatoPassaBusca(s, fmt, q)) out.push(fmt);
  }

  out.sort((a, b) => {
    const la = a.largura_mm ?? '';
    const lb = b.largura_mm ?? '';
    if (la !== lb) return la.localeCompare(lb, 'pt-BR', { numeric: true });
    return (a.comprimento_m ?? '').localeCompare(b.comprimento_m ?? '', 'pt-BR', { numeric: true });
  });
  return out;
}

/**
 * Posição física: item → dimensão → soma da quantidade → locais.
 * Não altera saldo oficial.
 */
export function itensPosicao<T extends ItemPosicao['saldo']>(
  saldos: T[],
  q: string,
  familia = '',
): Array<{ saldo: T; formatos: FormatoPosicao[] }> {
  const fam = familia.trim();
  const out: Array<{ saldo: T; formatos: FormatoPosicao[] }> = [];

  for (const saldo of saldos) {
    if (!loteComSaldo(saldo.qtde)) continue;
    if (fam && saldo.produto?.familia !== fam) continue;
    const formatos = formatosDoSaldo(saldo, q);
    if (q.trim()) {
      const produtoBate = coincideLinhaConsolidado(saldo.produto, null, q);
      if (!produtoBate && formatos.length === 0) continue;
    }
    out.push({ saldo, formatos });
  }

  out.sort((a, b) =>
    (a.saldo.produto?.codigo ?? '').localeCompare(b.saldo.produto?.codigo ?? '', 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }),
  );
  return out;
}

/** Uma linha = produto + dimensão + soma. Sem dimensão (tubete etc.) = uma linha com a qtde do SKU. */
export function linhasPosicao<T extends ItemPosicao['saldo']>(
  itens: Array<{ saldo: T; formatos: FormatoPosicao[] }>,
): Array<{ saldo: T; formato: FormatoPosicao | null }> {
  const out: Array<{ saldo: T; formato: FormatoPosicao | null }> = [];
  for (const item of itens) {
    if (item.formatos.length === 0) {
      out.push({ saldo: item.saldo, formato: null });
      continue;
    }
    for (const formato of item.formatos) {
      out.push({ saldo: item.saldo, formato });
    }
  }
  return out;
}

export function familiasNaPosicao(
  saldos: Array<{ produto?: { familia?: string | null } | null }>,
): string[] {
  const present = new Set(
    saldos.map((s) => s.produto?.familia).filter((f): f is string => Boolean(f)),
  );
  const ordered: string[] = ESTOQUE_FAMILIAS_ORDEM.filter((f) => present.has(f));
  for (const f of present) {
    if (!ordered.includes(f)) ordered.push(f);
  }
  return ordered;
}

/** Grupo do SKU (código estável do catálogo). */
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
