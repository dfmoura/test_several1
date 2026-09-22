import {
  TIPO_INDUSTRIALIZACAO,
  TIPO_SERVICO,
  tipoOperacaoFromSnap,
  type TipoOperacaoSaida,
  type TipoServicoSaida,
} from './operacoesSaida';
import {
  overridesForApi,
  parseOverridesFromSnap,
  type OrcOverrides,
} from './orcamentoParametrosAjuste';
import { type FacaPosicaoCodigo, isFacaPosicao } from './facaPosicao';
import { type SaidaEtiquetaCodigo, isSaidaEtiqueta } from './saidaEtiqueta';
import { modoComFrete, normalizarModoEntrega, totalPropostaFaixa } from './orcamentoFrete';
import { facaDimensoesExibicao } from './facasMapa';
import type { OrcamentoResult } from './api';

export type { OrcOverrides } from './orcamentoParametrosAjuste';

export const CORES_OPCOES = [
  { value: '0', label: '0 (lisa)' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '4V', label: '4V (4 cores + verniz)' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
] as const;

export const STATUS_EDITAVEL = new Set(['RASCUNHO', 'CALCULADO', 'REPROVADO']);

export function isOrcEditavel(status: string | undefined | null): boolean {
  return STATUS_EDITAVEL.has(String(status || ''));
}

export function isOrcEnviavel(status: string | undefined | null): boolean {
  return ['CALCULADO', 'REPROVADO', 'ENVIADO', 'VISUALIZADO'].includes(String(status || ''));
}

export function statusOrcLabel(status: string, financeiroStatus?: string | null): string {
  if (status === 'APROVADO' && financeiroStatus === 'AGUARDA_ADIANTAMENTO') {
    return 'Aguardando pagamento';
  }
  const labels: Record<string, string> = {
    RASCUNHO: 'Em preparação',
    CALCULADO: 'Em preparação',
    ENVIADO: 'Enviado p/ aprovação',
    VISUALIZADO: 'Enviado p/ aprovação',
    APROVADO: 'Aprovado',
    AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
    REPROVADO: 'Rejeitado',
    VENCIDO: 'Vencido',
    CANCELADO: 'Cancelado',
  };
  return labels[status] ?? status;
}

export function statusOrcPill(status: string, financeiroStatus?: string | null): string {
  if (status === 'APROVADO' && financeiroStatus === 'AGUARDA_ADIANTAMENTO') {
    return 'Aguardando pagamento';
  }
  const labels: Record<string, string> = {
    RASCUNHO: 'Em preparação',
    CALCULADO: 'Em preparação',
    ENVIADO: 'Enviado p/ aprovação',
    VISUALIZADO: 'Visualizado',
    APROVADO: 'Aprovado',
    AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
    REPROVADO: 'Rejeitado',
    VENCIDO: 'Vencido',
    CANCELADO: 'Cancelado',
  };
  return labels[status] ?? status;
}

export type FaixaForm = {
  quantidade: number;
  comissao_pct: number;
  /** Só prestação de serviço — preço comercial informado. */
  valor_unitario?: number;
};

/**
 * Arte / modelo operacional.
 * UI edita quantidades por faixa e valor cotado da arte;
 * `percentual` persiste no snapshot (Σ = 100) para PED/OP.
 * `valor_arte` soma no total comercial pós-motor (não em R1–R20).
 */
export type ModeloComposicaoForm = {
  ordem: number;
  nome: string;
  percentual: number;
  /** R$ cotado desta arte (opcional; default 0). */
  valor_arte: number;
  /** Visual opcional — http(s) ou ref `orc-arte:…` (upload). */
  arte_url?: string | null;
};

/** Composição de facas no ORC — ADR_ORC_FACAS_COMPOSICAO. */
export type FacaComposicaoForm = {
  ordem: number;
  principal: boolean;
  mapa_faca_id: number | null;
  n_facas: number | null;
  label: string;
  medida: string;
  formato: string;
  puxada_cm: number | '';
  largura_cm: number | '';
  z: number | '';
  maquina: string;
  colunas_mapa: string;
  posicao: FacaPosicaoCodigo | '';
  contorno_svg: string;
  diametro_cm: number | '';
  /** Átomo do mapa (altura ou texto); diâmetro fica em diametro_cm. */
  tamanho_raw: string;
  tamanho_tipo: string;
  faca_nova: boolean;
  valor_faca: number;
  prazo_faca_dias: number | '';
};

export type OrcForm = {
  tipo_operacao: TipoOperacaoSaida;
  tipo_servico: TipoServicoSaida;
  descricao_servico: string;
  material_cliente: boolean;
  unidade_servico: string;
  horas_maquina: number | '';
  parceiro_id: number | '';
  medida: string;
  largura_cm: number;
  puxada_cm: number;
  cores: string;
  papel: string;
  acabamento: string;
  modelos: number;
  /** Detalhe operacional; motor usa só `modelos`. */
  modelos_composicao: ModeloComposicaoForm[];
  /** Quantidades inteiras por faixa × modelo — [faixaIdx][modeloIdx]; colunas independentes. */
  modelos_composicao_quantidades: number[][];
  colunas: number;
  etiq_por_rolo: number;
  tubete: string;
  z: number | '';
  maquina: string;
  imposto_pct: number;
  /** Pad comercial interno em R$ (ADR_ORC_GORDURA_COMERCIAL) — não vai à proposta do cliente. */
  valor_gordura: number;
  matriz: 'SIM' | 'NAO';
  coluna_rebobinacao: number;
  /** Sentido de saída na bobina — ADR_ORC_SAIDA_ETIQUETA; fora do motor. */
  saida_etiqueta: SaidaEtiquetaCodigo | '';
  tipo_troca_produto: string;
  rpm: number;
  faixas: FaixaForm[];
  prazo_entrega_dias: number;
  validade_dias: number;
  tolerancia_qtd_pct: number;
  observacao: string;
  /** URL pública da prova de arte (PDF/imagem/Drive…). Opcional. */
  url_arte: string;
  faca_nova: boolean;
  formato_faca: string;
  valor_faca_nova: number;
  prazo_faca_dias: number | '';
  /** 0..N facas — principal alimenta geometria; extras = referência/cobrança. */
  facas: FacaComposicaoForm[];
  /** Visual da faca no mapa — snapshot; não entra no motor R1–R20 */
  faca_colunas_mapa: string;
  faca_posicao: FacaPosicaoCodigo | '';
  faca_contorno_svg: string;
  faca_diametro_cm: number | '';
  faca_tamanho_raw: string;
  faca_tamanho_tipo: string;
  /** Snapshot comercial desta proposta (defaults do PAR; não altera o motor). */
  condicao_pagamento: string;
  forma_pagamento: string;
  /** PAR papel vendedor — define % e quem recebe COM- após a baixa. */
  vendedor_parceiro_id: number | '';
  /** Fechamento: Retirar | Entrega própria | Entrega terceiros — ADR_ORC_FRETE_ESTIMADO. */
  modo_entrega: 'RETIRAR' | 'ENTREGA_PROPRIA' | 'ENTREGA_TERCEIROS';
  /** R$ opcional em entrega própria/terceiros. Vazio = a definir (não soma no total). */
  valor_frete_manual: number | '';
  /**
   * Ajustes de parâmetro só deste ORC (catálogo EMP permanece).
   * Vazio = motor usa tarifas vigentes / default.
   */
  overrides: OrcOverrides;
};

export type OrcCatalogo = {
  papeis: string[];
  acabamentos: string[];
  tubetes: string[];
  maquinas: string[];
  /** Presente na API por compatibilidade; não é usado na UI (não entra no preço). */
  maquinas_roda_servico?: string[];
  tipos_troca_produto: string[];
  imposto_pct_default: number;
  /** Tarifa vigente R$/cm² — mesma fonte do motor (catálogo / JSON). */
  matriz_cm2?: number;
  tipos_operacao?: Array<{ codigo: string; label: string; resumo: string }>;
  tipos_servico?: Array<{
    codigo: string;
    label: string;
    familia_fiscal: string;
    unidade_padrao: string;
    material_cliente_padrao: boolean;
    descricao_padrao: string;
  }>;
};

/** Soma comercial das facas cotadas (add-on do ORC). */
export function somaValorFacas(rows: FacaComposicaoForm[]): number {
  return Math.round(rows.reduce((s, r) => s + Math.max(0, Number(r.valor_faca) || 0), 0) * 100) / 100;
}

export function facaPrincipal(rows: FacaComposicaoForm[]): FacaComposicaoForm | null {
  if (!rows.length) return null;
  return rows.find((r) => r.principal) ?? rows[0] ?? null;
}

export function prazoMaxFacas(rows: FacaComposicaoForm[]): number | '' {
  let max: number | null = null;
  for (const r of rows) {
    const v = Math.max(0, Number(r.valor_faca) || 0);
    if (v <= 0 && !r.faca_nova) continue;
    if (r.prazo_faca_dias === '' || r.prazo_faca_dias == null) continue;
    const p = Number(r.prazo_faca_dias);
    if (!Number.isFinite(p)) continue;
    max = max == null ? p : Math.max(max, p);
  }
  return max == null ? '' : max;
}

function emptyFacaComposicao(partial?: Partial<FacaComposicaoForm>): FacaComposicaoForm {
  return {
    ordem: 1,
    principal: true,
    mapa_faca_id: null,
    n_facas: null,
    label: '',
    medida: '',
    formato: '',
    puxada_cm: '',
    largura_cm: '',
    z: '',
    maquina: '',
    colunas_mapa: '',
    posicao: '',
    contorno_svg: '',
    diametro_cm: '',
    tamanho_raw: '',
    tamanho_tipo: '',
    faca_nova: false,
    valor_faca: 0,
    prazo_faca_dias: '',
    ...partial,
  };
}

/** ORCs antigos sem átomo: deriva tamanho_raw da medida / diâmetro. */
function hidratarTamanhoRaw(f: FacaComposicaoForm): FacaComposicaoForm {
  if (f.tamanho_raw.trim()) return f;
  const dim = facaDimensoesExibicao({
    medida: f.medida,
    formato: f.formato,
    largura_faca: f.largura_cm === '' ? null : f.largura_cm,
    diametro_cm: f.diametro_cm === '' ? null : f.diametro_cm,
    tamanho_tipo: f.tamanho_tipo || null,
  });
  if (dim.tamanhoSort == null) return f;
  return { ...f, tamanho_raw: String(dim.tamanhoSort) };
}

/** Normaliza lista do snapshot / API; se ausente, sintetiza 0..1 do legado. */
export function facasFromSnapshot(snap: Record<string, unknown> | null | undefined): FacaComposicaoForm[] {
  if (!snap) return [];
  const raw = snap.facas;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    const rows = raw.map((row, i) => {
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const pos = String(r.posicao ?? '');
      return hidratarTamanhoRaw(
        emptyFacaComposicao({
        ordem: Number(r.ordem) || i + 1,
        principal: Boolean(r.principal),
        mapa_faca_id:
          r.mapa_faca_id == null || r.mapa_faca_id === '' ? null : Number(r.mapa_faca_id),
        n_facas: r.n_facas == null || r.n_facas === '' ? null : Number(r.n_facas),
        label: String(r.label ?? ''),
        medida: String(r.medida ?? ''),
        formato: String(r.formato ?? r.formato_faca ?? ''),
        puxada_cm:
          r.puxada_cm == null || r.puxada_cm === ''
            ? r.puxada == null || r.puxada === ''
              ? ''
              : Number(r.puxada)
            : Number(r.puxada_cm),
        largura_cm:
          r.largura_cm == null || r.largura_cm === ''
            ? r.largura_faca == null || r.largura_faca === ''
              ? ''
              : Number(r.largura_faca)
            : Number(r.largura_cm),
        z: r.z == null || r.z === '' ? '' : Number(r.z),
        maquina: String(r.maquina ?? r.maquina_catalogo ?? ''),
        colunas_mapa: String(r.colunas_mapa ?? r.faca_colunas_mapa ?? ''),
        posicao: isFacaPosicao(pos) ? (pos as FacaPosicaoCodigo) : '',
        contorno_svg: String(r.contorno_svg ?? r.faca_contorno_svg ?? ''),
        diametro_cm:
          r.diametro_cm == null || r.diametro_cm === ''
            ? r.faca_diametro_cm == null || r.faca_diametro_cm === ''
              ? ''
              : Number(r.faca_diametro_cm)
            : Number(r.diametro_cm),
        tamanho_raw: String(r.tamanho_raw ?? r.faca_tamanho_raw ?? ''),
        tamanho_tipo: String(r.tamanho_tipo ?? r.faca_tamanho_tipo ?? ''),
        faca_nova: Boolean(r.faca_nova),
        valor_faca: Math.max(0, Number(r.valor_faca ?? r.valor_faca_nova) || 0),
        prazo_faca_dias:
          r.prazo_faca_dias == null || r.prazo_faca_dias === ''
            ? ''
            : Number(r.prazo_faca_dias),
      }),
      );
    });
    if (!rows.some((r) => r.principal) && rows[0]) {
      rows[0] = { ...rows[0], principal: true };
    }
    return rows.map((r, i) => ({ ...r, ordem: i + 1 }));
  }

  const formato = String(snap.formato_faca ?? '');
  const facaNova = Boolean(snap.faca_nova);
  const hasVisual =
    String(snap.faca_colunas_mapa ?? '').trim() !== '' ||
    String(snap.faca_posicao ?? '').trim() !== '' ||
    String(snap.faca_contorno_svg ?? '').trim() !== '' ||
    (snap.faca_diametro_cm != null && snap.faca_diametro_cm !== '') ||
    String(snap.faca_tamanho_raw ?? '').trim() !== '' ||
    String(snap.faca_tamanho_tipo ?? '').trim() !== '';
  if (!formato && !facaNova && !hasVisual) return [];

  const pos = String(snap.faca_posicao ?? '');
  return [
    hidratarTamanhoRaw(
      emptyFacaComposicao({
        principal: true,
        label: facaNova ? 'Faca nova' : '',
        medida: String(snap.medida ?? ''),
        formato: formato || (facaNova ? 'RETA' : ''),
        puxada_cm: snap.puxada_cm == null || snap.puxada_cm === '' ? '' : Number(snap.puxada_cm),
        largura_cm: snap.largura_cm == null || snap.largura_cm === '' ? '' : Number(snap.largura_cm),
        z: snap.z == null || snap.z === '' ? '' : Number(snap.z),
        maquina: String(snap.maquina ?? ''),
        colunas_mapa: String(snap.faca_colunas_mapa ?? ''),
        posicao: isFacaPosicao(pos) ? (pos as FacaPosicaoCodigo) : '',
        contorno_svg: String(snap.faca_contorno_svg ?? ''),
        diametro_cm:
          snap.faca_diametro_cm == null || snap.faca_diametro_cm === ''
            ? ''
            : Number(snap.faca_diametro_cm),
        tamanho_raw: String(snap.faca_tamanho_raw ?? ''),
        tamanho_tipo: String(snap.faca_tamanho_tipo ?? ''),
        faca_nova: facaNova,
        valor_faca: facaNova ? Math.max(0, Number(snap.valor_faca_nova) || 0) : 0,
        prazo_faca_dias:
          !facaNova || snap.prazo_faca_dias == null || snap.prazo_faca_dias === ''
            ? ''
            : Number(snap.prazo_faca_dias),
      }),
    ),
  ];
}

/** Projeta principal + Σ nos escalares legado do form. */
export function scalarsFromFacas(facas: FacaComposicaoForm[]): Pick<
  OrcForm,
  | 'faca_nova'
  | 'formato_faca'
  | 'valor_faca_nova'
  | 'prazo_faca_dias'
  | 'faca_colunas_mapa'
  | 'faca_posicao'
  | 'faca_contorno_svg'
  | 'faca_diametro_cm'
  | 'faca_tamanho_raw'
  | 'faca_tamanho_tipo'
> {
  const p = facaPrincipal(facas);
  const soma = somaValorFacas(facas);
  const temNova = facas.some((f) => f.faca_nova);
  return {
    faca_nova: temNova || soma > 0,
    formato_faca: p?.formato ?? '',
    valor_faca_nova: soma,
    prazo_faca_dias: prazoMaxFacas(facas),
    faca_colunas_mapa: p?.colunas_mapa ?? '',
    faca_posicao: p?.posicao ?? '',
    faca_contorno_svg: p?.contorno_svg ?? '',
    faca_diametro_cm: p?.diametro_cm ?? '',
    faca_tamanho_raw: p?.tamanho_raw ?? '',
    faca_tamanho_tipo: p?.tamanho_tipo ?? '',
  };
}

export function renumerarFacas(rows: FacaComposicaoForm[]): FacaComposicaoForm[] {
  return rows.map((r, i) => ({ ...r, ordem: i + 1 }));
}

/** Rótulo comercial de uma linha (FAT / tabela / proposta). */
export function rotuloFacaLinha(f: {
  ordem?: number;
  n_facas?: number | null;
  label?: string | null;
  formato?: string | null;
  medida?: string | null;
  largura_cm?: number | string | null;
  diametro_cm?: number | string | null;
  tamanho_raw?: string | null;
  tamanho_tipo?: string | null;
  faca_nova?: boolean;
}): string {
  const label = String(f.label ?? '').trim();
  if (label) return label.slice(0, 100);
  const parts: string[] = [];
  if (f.n_facas != null && Number.isFinite(Number(f.n_facas))) parts.push(`N ${f.n_facas}`);
  if (f.formato) parts.push(String(f.formato));
  const dim = facaDimensoesExibicao({
    medida: f.medida,
    formato: f.formato,
    largura_faca: f.largura_cm ?? null,
    diametro_cm: f.diametro_cm ?? null,
    tamanho_raw: f.tamanho_raw ?? null,
    tamanho_tipo: f.tamanho_tipo ?? null,
  });
  if (dim.titulo && dim.titulo !== '—') parts.push(dim.titulo);
  if (parts.length) return parts.join(' · ').slice(0, 100);
  if (f.faca_nova) return 'Faca nova';
  return `Faca ${f.ordem ?? 1}`;
}

/** Label de add-on comercial (Σ) — evita “Faca nova” quando a cobrança é mapa. */
export function labelFerramentalAddOn(opts: {
  facaNova?: boolean;
  valor?: number;
  count?: number;
}): string {
  const count = opts.count ?? 0;
  if (count > 1) return 'Ferramental';
  if (opts.facaNova && (opts.valor ?? 0) > 0) return 'Faca nova';
  if ((opts.valor ?? 0) > 0) return 'Ferramental';
  return 'Ferramental';
}

/** Equal-split canônico (soma = 100); preserva nomes nas posições existentes. */
export function syncModelosComposicao(
  prev: ModeloComposicaoForm[] | undefined,
  n: number,
): ModeloComposicaoForm[] {
  const count = Math.max(1, Math.floor(n) || 1);
  const base = Math.floor(10000 / count) / 100;
  const out: ModeloComposicaoForm[] = [];
  let acc = 0;
  for (let i = 0; i < count; i++) {
    const pct = i === count - 1 ? Math.round((100 - acc) * 10000) / 10000 : base;
    acc += pct;
    out.push({
      ordem: i + 1,
      nome: prev?.[i]?.nome ?? '',
      percentual: pct,
      valor_arte: Math.max(0, Number(prev?.[i]?.valor_arte) || 0),
      arte_url: prev?.[i]?.arte_url?.trim() || null,
    });
  }
  return out;
}

export function somaPercentualModelos(rows: ModeloComposicaoForm[]): number {
  return Math.round(rows.reduce((s, r) => s + (Number(r.percentual) || 0), 0) * 10000) / 10000;
}

/** Soma comercial das artes cotadas (add-on do ORC). */
export function somaValorArteModelos(rows: ModeloComposicaoForm[]): number {
  return Math.round(rows.reduce((s, r) => s + Math.max(0, Number(r.valor_arte) || 0), 0) * 100) / 100;
}

/** Equal-split inteiro numa faixa; resto no último modelo. */
export function alocarEqualSplitQuantidades(faixaTotal: number, nModelos: number): number[] {
  const total = Math.max(0, Math.floor(faixaTotal) || 0);
  const n = Math.max(1, Math.floor(nModelos) || 1);
  if (n === 1) return [total];
  const base = Math.floor(total / n);
  const qs = Array.from({ length: n }, () => base);
  qs[n - 1] = total - base * (n - 1);
  return qs;
}

/** Fecha a linha da matriz: último modelo = restante da faixa. */
export function reconciliarMatrizFaixaRow(quantidades: number[], faixaTotal: number): number[] {
  const total = Math.max(0, Math.floor(faixaTotal) || 0);
  const n = quantidades.length;
  if (n === 0) return [];
  if (n === 1) return [total];
  const qs = quantidades.map((q) => Math.max(0, Math.floor(q) || 0));
  const sumEditaveis = qs.slice(0, n - 1).reduce((s, q) => s + q, 0);
  qs[n - 1] = Math.max(0, total - sumEditaveis);
  return qs;
}

/**
 * Sincroniza a matriz de quantidades com faixas × modelos.
 * Preserva valores existentes; preenche novas linhas/colunas com equal-split.
 */
export function syncModelosComposicaoQuantidades(
  prev: number[][] | undefined,
  faixas: FaixaForm[],
  modelos: number,
  composicao: ModeloComposicaoForm[],
): number[][] {
  const n = Math.max(1, Math.floor(modelos) || 1);
  return faixas.map((f, fi) => {
    const total = Math.max(0, Math.floor(f.quantidade) || 0);
    const prevRow = prev?.[fi];
    if (Array.isArray(prevRow) && prevRow.length === n) {
      return reconciliarMatrizFaixaRow(prevRow, total);
    }
    if (Array.isArray(prevRow) && prevRow.length > 0) {
      const resized = prevRow.slice(0, n);
      while (resized.length < n) {
        resized.push(0);
      }
      return reconciliarMatrizFaixaRow(resized, total);
    }
    if (total > 0 && composicao.length === n) {
      return alocarQuantidadePorModelo(total, composicao).map((r) => r.quantidade);
    }
    return alocarEqualSplitQuantidades(total, n);
  });
}

/** Matriz [faixaIdx][modeloIdx] — usa snapshot quando presente; senão deriva de %. */
export function matrizQuantidadesModelos(
  faixas: FaixaForm[],
  rows: ModeloComposicaoForm[],
  matriz?: number[][],
): number[][] {
  return faixas.map((f, fi) => {
    const total = Math.max(0, Math.floor(f.quantidade) || 0);
    const row = matriz?.[fi];
    if (Array.isArray(row) && row.length === rows.length) {
      return reconciliarMatrizFaixaRow(row, total);
    }
    return alocarQuantidadePorModelo(total, rows).map((r) => r.quantidade);
  });
}

/** Percentuais a partir das quantidades de uma faixa (Σ = 100). */
export function percentuaisFromQuantidadesFaixa(
  quantidades: number[],
  faixaTotal: number,
): number[] {
  const total = Math.max(0, Math.floor(faixaTotal) || 0);
  const n = quantidades.length;
  if (n === 0) return [];
  if (n === 1) return [100];
  const pcts: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      pcts.push(Math.round((100 - acc) * 10000) / 10000);
    } else {
      const q = Math.max(0, Math.floor(quantidades[i]) || 0);
      const pct = total > 0 ? Math.round((q / total) * 10000) / 100 : 0;
      pcts.push(pct);
      acc += pct;
    }
  }
  return pcts;
}

/** % de referência (1ª faixa Q>0) para compatibilidade legada / PED. */
export function syncPercentualReferencia(
  composicao: ModeloComposicaoForm[],
  faixas: FaixaForm[],
  matriz: number[][],
): ModeloComposicaoForm[] {
  for (let fi = 0; fi < faixas.length; fi++) {
    const total = Math.max(0, Math.floor(faixas[fi]?.quantidade) || 0);
    if (total <= 0) continue;
    const row = matriz[fi];
    if (!Array.isArray(row) || row.length !== composicao.length) continue;
    const pcts = percentuaisFromQuantidadesFaixa(row, total);
    return composicao.map((m, i) => ({ ...m, percentual: pcts[i] ?? m.percentual }));
  }
  return composicao;
}

/** Equal-split em todas as faixas com Q > 0. */
export function equalizarMatrizTodasFaixas(faixas: FaixaForm[], nModelos: number): number[][] {
  const n = Math.max(1, Math.floor(nModelos) || 1);
  return faixas.map((f) =>
    alocarEqualSplitQuantidades(Math.max(0, Math.floor(f.quantidade) || 0), n),
  );
}

/**
 * Edita uma célula da matriz — só a faixa informada muda; demais colunas intactas.
 */
export function aplicarQuantidadeModeloMatriz(
  matriz: number[][],
  faixas: FaixaForm[],
  faixaIdx: number,
  modeloIdx: number,
  newQtd: number,
  nModelos: number,
): number[][] {
  const n = Math.max(1, Math.floor(nModelos) || 1);
  const faixaTotal = Math.max(0, Math.floor(faixas[faixaIdx]?.quantidade) || 0);
  const out = matriz.map((row) => [...row]);
  while (out.length < faixas.length) {
    out.push(alocarEqualSplitQuantidades(0, n));
  }
  const current = reconciliarMatrizFaixaRow(
    out[faixaIdx]?.length === n ? [...out[faixaIdx]] : alocarEqualSplitQuantidades(faixaTotal, n),
    faixaTotal,
  );

  if (n === 1) {
    out[faixaIdx] = [faixaTotal];
    return out;
  }
  if (modeloIdx >= n - 1) {
    out[faixaIdx] = current;
    return out;
  }

  const qs = [...current];
  const desired = Math.max(0, Math.floor(newQtd) || 0);
  const sumExceptEdited = qs.slice(0, n - 1).reduce((s, q, i) => (i === modeloIdx ? s : s + q), 0);
  const maxAllowed = Math.max(0, faixaTotal - sumExceptEdited);
  qs[modeloIdx] = Math.min(desired, maxAllowed);
  out[faixaIdx] = reconciliarMatrizFaixaRow(qs, faixaTotal);
  return out;
}

/** Reconcilia resto quando o total da faixa muda (escada comercial). */
export function ajustarMatrizFaixaTotal(
  matriz: number[][],
  faixas: FaixaForm[],
  faixaIdx: number,
  nModelos: number,
): number[][] {
  const n = Math.max(1, Math.floor(nModelos) || 1);
  const total = Math.max(0, Math.floor(faixas[faixaIdx]?.quantidade) || 0);
  const out = matriz.map((row) => [...row]);
  while (out.length < faixas.length) {
    out.push(alocarEqualSplitQuantidades(0, n));
  }
  const prev = out[faixaIdx];
  const base =
    Array.isArray(prev) && prev.length === n
      ? prev
      : alocarEqualSplitQuantidades(total, n);
  out[faixaIdx] = reconciliarMatrizFaixaRow(base, total);
  return out;
}

/** Atualiza percentuais a partir das quantidades informadas numa faixa (soma = total da faixa). */
export function composicaoFromQuantidadesFaixa(
  prev: ModeloComposicaoForm[],
  quantidades: number[],
  faixaTotal: number,
): ModeloComposicaoForm[] {
  const total = Math.max(0, Math.floor(faixaTotal) || 0);
  const n = quantidades.length;
  if (n === 0) return prev;
  const pcts = percentuaisFromQuantidadesFaixa(quantidades, total);
  return prev.map((m, i) => ({ ...m, percentual: pcts[i] ?? m.percentual }));
}

/** Mensagem de validação da composição; null se OK. */
export function validarModelosComposicao(
  modelos: number,
  rows: ModeloComposicaoForm[],
  faixas?: FaixaForm[],
  matriz?: number[][],
): string | null {
  const n = Math.max(1, Math.floor(modelos) || 1);
  if (rows.length !== n) {
    return `Detalhe exatamente ${n} modelo(s) (nome + quantidade por faixa).`;
  }
  for (let i = 0; i < rows.length; i++) {
    const nome = String(rows[i]?.nome ?? '').trim();
    if (!nome) {
      return `Informe o nome do modelo ${i + 1} (arte / referência).`;
    }
    const pct = Number(rows[i]?.percentual);
    if (!(pct > 0) || pct > 100) {
      return `Quantidade do modelo ${i + 1} deve ser > 0 em cada faixa.`;
    }
    const va = Number(rows[i]?.valor_arte);
    if (va < 0 || !Number.isFinite(va)) {
      return `Vlr. Arte do modelo ${i + 1} deve ser ≥ 0.`;
    }
  }
  const soma = somaPercentualModelos(rows);
  if (Math.abs(soma - 100) > 0.01) {
    return `A distribuição entre modelos deve fechar o total de cada faixa.`;
  }

  if (faixas && faixas.length > 0) {
    const qtdMatriz = matrizQuantidadesModelos(faixas, rows, matriz);
    for (let fi = 0; fi < faixas.length; fi++) {
      const fq = Math.floor(faixas[fi]?.quantidade) || 0;
      if (fq <= 0) continue;
      const aloc = qtdMatriz[fi] ?? [];
      const somaQtd = aloc.reduce((s, q) => s + q, 0);
      if (somaQtd !== fq) {
        return `Faixa ${fi + 1}: soma dos modelos (${somaQtd.toLocaleString('pt-BR')}) difere do total (${fq.toLocaleString('pt-BR')}).`;
      }
      for (let mi = 0; mi < aloc.length; mi++) {
        if (aloc[mi] <= 0) {
          return `Modelo ${mi + 1}: quantidade deve ser > 0 na faixa ${fi + 1}.`;
        }
      }
    }
  }

  return null;
}

/**
 * Aloca Q por %; resto no último (para preview / PED futuro).
 */
export function alocarQuantidadePorModelo(
  quantidadeTotal: number,
  rows: ModeloComposicaoForm[],
): Array<ModeloComposicaoForm & { quantidade: number }> {
  const q = Math.max(0, Math.floor(quantidadeTotal) || 0);
  const n = rows.length;
  if (n === 0) return [];
  let alocado = 0;
  return rows.map((r, i) => {
    let qi: number;
    if (i === n - 1) {
      qi = q - alocado;
    } else {
      qi = Math.floor((q * (Number(r.percentual) || 0)) / 100 + 1e-9);
      alocado += qi;
    }
    return { ...r, quantidade: Math.max(0, qi) };
  });
}

export function defaultOrcForm(catalog: OrcCatalogo | null): OrcForm {
  const papeis = catalog?.papeis ?? [];
  const acabamentos = catalog?.acabamentos ?? [];
  const maquinas = catalog?.maquinas ?? [];
  const tipos = catalog?.tipos_troca_produto ?? [];
  return {
    tipo_operacao: TIPO_INDUSTRIALIZACAO,
    tipo_servico: 'REBOBINACAO',
    descricao_servico: '',
    material_cliente: true,
    unidade_servico: 'RL',
    horas_maquina: '',
    parceiro_id: '',
    medida: '',
    largura_cm: 0,
    puxada_cm: 0,
    cores: '4',
    papel: papeis[0] ?? 'COUCHE',
    acabamento: acabamentos[0] ?? 'SEM ACABAMENTO',
    modelos: 1,
    modelos_composicao: syncModelosComposicao([], 1),
    modelos_composicao_quantidades: [alocarEqualSplitQuantidades(0, 1)],
    colunas: 1,
    etiq_por_rolo: 1000,
    tubete: '1"',
    z: '',
    maquina: maquinas[0] ?? 'BETA',
    imposto_pct: catalog?.imposto_pct_default ?? 16,
    valor_gordura: 0,
    matriz: 'SIM',
    coluna_rebobinacao: 1,
    saida_etiqueta: '',
    tipo_troca_produto: tipos[0] ?? 'SEM PARADA',
    rpm: 1000,
    // Escada comercial: uma linha em branco — comercial preenche; sem faixas de exemplo.
    faixas: [{ quantidade: 0, comissao_pct: 0 }],
    prazo_entrega_dias: 12,
    validade_dias: 7,
    tolerancia_qtd_pct: 20,
    observacao: '',
    url_arte: '',
    faca_nova: false,
    formato_faca: '',
    valor_faca_nova: 0,
    prazo_faca_dias: '',
    facas: [],
    faca_colunas_mapa: '',
    faca_posicao: '',
    faca_contorno_svg: '',
    faca_diametro_cm: '',
    faca_tamanho_raw: '',
    faca_tamanho_tipo: '',
    condicao_pagamento: '',
    forma_pagamento: '',
    vendedor_parceiro_id: '',
    modo_entrega: 'RETIRAR',
    valor_frete_manual: '',
    overrides: {},
  };
}

export function formFromSnapshot(
  snap: Record<string, unknown> | null | undefined,
  catalog: OrcCatalogo | null,
): OrcForm {
  const base = defaultOrcForm(catalog);
  if (!snap) return base;
  const faixasRaw = (snap.faixas as FaixaForm[]) ?? base.faixas;
  const modelos = Number(snap.modelos) || 1;
  const compRaw = Array.isArray(snap.modelos_composicao)
    ? (snap.modelos_composicao as ModeloComposicaoForm[])
    : [];
  const modelos_composicao =
    compRaw.length === modelos
      ? compRaw.map((r, i) => ({
          ordem: Number(r.ordem) || i + 1,
          nome: String(r.nome ?? ''),
          percentual: Number(r.percentual) || 0,
          valor_arte: Math.max(0, Number(r.valor_arte) || 0),
          arte_url: String(r.arte_url ?? '').trim() || null,
        }))
      : syncModelosComposicao(compRaw, modelos);

  const matrizRaw = Array.isArray(snap.modelos_composicao_quantidades)
    ? (snap.modelos_composicao_quantidades as number[][])
    : undefined;
  const modelos_composicao_quantidades = syncModelosComposicaoQuantidades(
    matrizRaw,
    faixasRaw,
    modelos,
    modelos_composicao,
  );

  return {
    ...base,
    tipo_operacao: tipoOperacaoFromSnap(snap),
    tipo_servico: (String(snap.tipo_servico || 'REBOBINACAO').toUpperCase() as TipoServicoSaida) || 'REBOBINACAO',
    descricao_servico: String(snap.descricao_servico ?? ''),
    material_cliente: snap.material_cliente !== false,
    unidade_servico: String(snap.unidade ?? 'RL'),
    horas_maquina:
      snap.horas_maquina == null || snap.horas_maquina === '' ? '' : Number(snap.horas_maquina),
    parceiro_id:
      snap.parceiro_id == null || snap.parceiro_id === ''
        ? ''
        : Number(snap.parceiro_id),
    medida: String(snap.medida ?? ''),
    largura_cm: Number(snap.largura_cm) || 0,
    puxada_cm: Number(snap.puxada_cm) || 0,
    cores: String(snap.cores ?? base.cores),
    papel: String(snap.papel ?? base.papel),
    acabamento: String(snap.acabamento ?? base.acabamento),
    modelos,
    modelos_composicao,
    modelos_composicao_quantidades,
    colunas: Number(snap.colunas) || 1,
    etiq_por_rolo: Number(snap.etiq_por_rolo) || 1000,
    tubete: String(snap.tubete ?? base.tubete),
    z: snap.z == null || snap.z === '' ? '' : Number(snap.z),
    maquina: String(snap.maquina ?? base.maquina),
    imposto_pct: Number(snap.imposto_pct) || base.imposto_pct,
    valor_gordura: Math.max(0, Number(snap.valor_gordura) || 0),
    matriz: String(snap.matriz) === 'NAO' ? 'NAO' : 'SIM',
    coluna_rebobinacao: Number(snap.coluna_rebobinacao) || 1,
    saida_etiqueta: isSaidaEtiqueta(String(snap.saida_etiqueta ?? ''))
      ? (String(snap.saida_etiqueta) as SaidaEtiquetaCodigo)
      : '',
    tipo_troca_produto: String(snap.tipo_troca_produto ?? base.tipo_troca_produto),
    rpm: Number(snap.rpm) || 1000,
    faixas: faixasRaw.map((f) => ({
      quantidade: Number(f.quantidade) || 0,
      comissao_pct: Number(f.comissao_pct) || 0,
      valor_unitario: Number(f.valor_unitario) || undefined,
    })),
    prazo_entrega_dias: Number(snap.prazo_entrega_dias) || 12,
    validade_dias: Number(snap.validade_dias) || 7,
    tolerancia_qtd_pct: Number(snap.tolerancia_qtd_pct) || 20,
    observacao: String(snap.observacao ?? ''),
    url_arte: String(snap.url_arte ?? ''),
    ...(() => {
      const facas = facasFromSnapshot(snap);
      const projected = scalarsFromFacas(facas);
      if (facas.length > 0) {
        return { facas, ...projected };
      }
      return {
        facas,
        faca_nova: Boolean(snap.faca_nova),
        formato_faca: String(snap.formato_faca ?? ''),
        valor_faca_nova: Number(snap.valor_faca_nova) || 0,
        prazo_faca_dias:
          snap.prazo_faca_dias == null || snap.prazo_faca_dias === ''
            ? ''
            : Number(snap.prazo_faca_dias),
        faca_colunas_mapa: String(snap.faca_colunas_mapa ?? ''),
        faca_posicao: isFacaPosicao(String(snap.faca_posicao ?? ''))
          ? (String(snap.faca_posicao) as FacaPosicaoCodigo)
          : '',
        faca_contorno_svg: String(snap.faca_contorno_svg ?? ''),
        faca_diametro_cm:
          snap.faca_diametro_cm == null || snap.faca_diametro_cm === ''
            ? snap.diametro_cm == null || snap.diametro_cm === ''
              ? ''
              : Number(snap.diametro_cm)
            : Number(snap.faca_diametro_cm),
        faca_tamanho_raw: String(snap.faca_tamanho_raw ?? snap.tamanho_raw ?? ''),
        faca_tamanho_tipo: String(snap.faca_tamanho_tipo ?? snap.tamanho_tipo ?? ''),
      };
    })(),
    condicao_pagamento: String(snap.condicao_pagamento ?? ''),
    forma_pagamento: String(snap.forma_pagamento ?? ''),
    vendedor_parceiro_id:
      snap.vendedor_parceiro_id == null || snap.vendedor_parceiro_id === ''
        ? ''
        : Number(snap.vendedor_parceiro_id),
    modo_entrega: normalizarModoEntrega(String(snap.modo_entrega ?? '')),
    valor_frete_manual:
      snap.valor_frete_manual == null || snap.valor_frete_manual === ''
        ? ''
        : Number(snap.valor_frete_manual),
    overrides: parseOverridesFromSnap(snap.overrides),
  };
}

/** Campos de cabeçalho do documento ORC (ADR_ORC_ITENS). */
export const ORC_HEADER_KEYS = [
  'tipo_operacao',
  'parceiro_id',
  'prazo_entrega_dias',
  'validade_dias',
  'tolerancia_qtd_pct',
  'observacao',
  'url_arte',
  'condicao_pagamento',
  'forma_pagamento',
  'vendedor_parceiro_id',
  'modo_entrega',
  'valor_frete_manual',
] as const;

export type OrcHeaderKey = (typeof ORC_HEADER_KEYS)[number];

const ORC_PAYLOAD_HEADER_KEYS = new Set<string>([
  ...ORC_HEADER_KEYS,
  'necessidade',
]);

export function syncHeaderAcrossItens(itens: OrcForm[], headerSource: OrcForm): OrcForm[] {
  const header: Pick<OrcForm, OrcHeaderKey> = {
    tipo_operacao: headerSource.tipo_operacao,
    parceiro_id: headerSource.parceiro_id,
    prazo_entrega_dias: headerSource.prazo_entrega_dias,
    validade_dias: headerSource.validade_dias,
    tolerancia_qtd_pct: headerSource.tolerancia_qtd_pct,
    observacao: headerSource.observacao,
    url_arte: headerSource.url_arte,
    condicao_pagamento: headerSource.condicao_pagamento,
    forma_pagamento: headerSource.forma_pagamento,
    vendedor_parceiro_id: headerSource.vendedor_parceiro_id,
    modo_entrega: headerSource.modo_entrega,
    valor_frete_manual: headerSource.valor_frete_manual,
  };
  return itens.map((item) => ({ ...item, ...header }));
}

export function headerFrom(form: OrcForm): Record<string, unknown> {
  const full = payloadFromForm(form);
  const out: Record<string, unknown> = {};
  for (const key of ORC_HEADER_KEYS) {
    if (key === 'parceiro_id') {
      out.parceiro_id = full.parceiro_id;
    } else if (key in full) {
      out[key] = full[key];
    }
  }
  if (full.tipo_operacao) out.tipo_operacao = full.tipo_operacao;
  if (full.necessidade) out.necessidade = full.necessidade;

  return out;
}

export function jobOnlyPayload(form: OrcForm, rotulo?: string | null): Record<string, unknown> {
  const full = payloadFromForm(form);
  const job: Record<string, unknown> = {};
  if (rotulo) job.rotulo = rotulo;
  for (const [k, v] of Object.entries(full)) {
    if (!ORC_PAYLOAD_HEADER_KEYS.has(k)) {
      job[k] = v;
    }
  }

  return job;
}

export function payloadFromFormDocumento(
  itens: OrcForm[],
  rotulos?: (string | null)[],
): Record<string, unknown> {
  if (itens.length === 0) {
    return payloadFromForm(defaultOrcForm(null));
  }
  if (itens.length === 1) {
    return payloadFromForm(itens[0]);
  }

  return {
    ...headerFrom(itens[0]),
    itens: itens.map((item, i) => jobOnlyPayload(item, rotulos?.[i] ?? null)),
  };
}

export function cloneOrcFormItem(source: OrcForm, catalog: OrcCatalogo | null): OrcForm {
  const base = defaultOrcForm(catalog);
  return {
    ...base,
    ...source,
    faixas: source.faixas.map((f) => ({ ...f })),
    modelos_composicao: source.modelos_composicao.map((m) => ({ ...m })),
    modelos_composicao_quantidades:
      source.modelos_composicao_quantidades?.map((row) => [...row]) ??
      syncModelosComposicaoQuantidades(
        undefined,
        source.faixas,
        source.modelos,
        source.modelos_composicao,
      ),
    facas: source.facas.map((f) => ({ ...f })),
    overrides: { ...source.overrides },
  };
}

/** Reconstrói o result de UI com itens+totais a partir do show (ADR_ORC_ITENS). */
export function calculoComItensDoOrcamento(
  result: OrcamentoResult | null | undefined,
  itens: Array<{
    ordem: number;
    rotulo?: string | null;
    result_snapshot?: OrcamentoResult | null;
  }> | null | undefined,
): OrcamentoResult | null {
  if (!result) return null;
  if (!itens || itens.length <= 1) {
    const { itens: _i, totais: _t, ...rest } = result;
    return rest as OrcamentoResult;
  }
  if (result.itens && result.itens.length > 1 && result.totais) {
    return result;
  }
  const preview = itens.map((item) => ({
    ordem: item.ordem,
    rotulo: item.rotulo ?? null,
    result: (item.result_snapshot ?? { faixas: [] }) as OrcamentoResult,
  }));
  let soma = 0;
  for (const p of preview) {
    const fx0 = p.result.faixas?.[0];
    if (!fx0) continue;
    const facas = facasFromSnapshot({
      facas: p.result.facas,
      faca_nova: p.result.faca_nova,
      formato_faca: p.result.formato_faca,
      valor_faca_nova: p.result.valor_faca_nova,
    });
    const vFaca = somaValorFacas(facas) || Number(p.result.valor_faca_nova) || 0;
    const vArtes = Number(p.result.valor_artes) || 0;
    soma += Number(
      totalPropostaFaixa(fx0, Boolean(p.result.faca_nova), vFaca, vArtes),
    );
  }
  return {
    ...result,
    itens: preview,
    totais: {
      soma_primeira_faixa_proposta: Math.round(soma * 100) / 100,
      n_itens: preview.length,
    },
  };
}

export function payloadFromForm(form: OrcForm): Record<string, unknown> {
  if (form.tipo_operacao === TIPO_SERVICO) {
    return {
      tipo_operacao: TIPO_SERVICO,
      necessidade: 'SERVICO',
      tipo_servico: form.tipo_servico,
      descricao_servico: form.descricao_servico.trim(),
      material_cliente: form.material_cliente,
      unidade: form.unidade_servico || 'UN',
      horas_maquina: form.horas_maquina === '' ? null : form.horas_maquina,
      maquina: form.maquina || null,
      parceiro_id: form.parceiro_id === '' ? null : form.parceiro_id,
      faixas: form.faixas.map((f) => ({
        quantidade: f.quantidade,
        valor_unitario: Number(f.valor_unitario) || 0,
        comissao_pct: f.comissao_pct,
      })),
      prazo_entrega_dias: form.prazo_entrega_dias,
      validade_dias: form.validade_dias,
      tolerancia_qtd_pct: form.tolerancia_qtd_pct,
      observacao: form.observacao || null,
      url_arte: form.url_arte.trim() || null,
      condicao_pagamento: form.condicao_pagamento.trim() || null,
      forma_pagamento: form.forma_pagamento.trim() || null,
      vendedor_parceiro_id: form.vendedor_parceiro_id === '' ? null : form.vendedor_parceiro_id,
      modo_entrega: form.modo_entrega,
      valor_gordura: Math.max(0, Number(form.valor_gordura) || 0),
      valor_frete_manual:
        modoComFrete(form.modo_entrega) && form.valor_frete_manual !== ''
          ? form.valor_frete_manual
          : null,
    };
  }

  return {
    tipo_operacao: TIPO_INDUSTRIALIZACAO,
    necessidade: 'PRODUCAO',
    parceiro_id: form.parceiro_id === '' ? null : form.parceiro_id,
    medida: form.medida,
    largura_cm: form.largura_cm,
    puxada_cm: form.puxada_cm,
    cores: form.cores,
    papel: form.papel,
    acabamento: form.acabamento,
    modelos: form.modelos,
    modelos_composicao: syncPercentualReferencia(
      form.modelos_composicao,
      form.faixas,
      form.modelos_composicao_quantidades,
    ).map((m, i) => ({
      ordem: i + 1,
      nome: m.nome.trim(),
      percentual: Number(m.percentual) || 0,
      valor_arte: Math.max(0, Number(m.valor_arte) || 0),
      arte_url: m.arte_url?.trim() || null,
    })),
    modelos_composicao_quantidades: matrizQuantidadesModelos(
      form.faixas,
      form.modelos_composicao,
      form.modelos_composicao_quantidades,
    ),
    colunas: form.colunas,
    etiq_por_rolo: form.etiq_por_rolo,
    tubete: form.tubete,
    z: form.z === '' ? null : form.z,
    maquina: form.maquina,
    imposto_pct: form.imposto_pct,
    valor_gordura: Math.max(0, Number(form.valor_gordura) || 0),
    matriz: form.matriz,
    coluna_rebobinacao: form.coluna_rebobinacao,
    saida_etiqueta: form.saida_etiqueta || null,
    tipo_troca_produto: form.tipo_troca_produto,
    rpm: form.rpm,
    faixas: form.faixas,
    prazo_entrega_dias: form.prazo_entrega_dias,
    validade_dias: form.validade_dias,
    tolerancia_qtd_pct: form.tolerancia_qtd_pct,
    observacao: form.observacao || null,
    url_arte: form.url_arte.trim() || null,
    facas: form.facas.map((f, i) => ({
      ordem: i + 1,
      principal: Boolean(f.principal),
      mapa_faca_id: f.mapa_faca_id,
      n_facas: f.n_facas,
      label: f.label.trim() || null,
      medida: f.medida.trim() || null,
      formato: f.formato.trim() || null,
      puxada_cm: f.puxada_cm === '' ? null : Number(f.puxada_cm) || null,
      largura_cm: f.largura_cm === '' ? null : Number(f.largura_cm) || null,
      z: f.z === '' ? null : Number(f.z),
      maquina: f.maquina.trim() || null,
      colunas_mapa: f.colunas_mapa.trim() || null,
      posicao: f.posicao || null,
      contorno_svg: f.contorno_svg.trim() || null,
      diametro_cm: f.diametro_cm === '' ? null : Number(f.diametro_cm) || null,
      tamanho_raw: f.tamanho_raw.trim() || null,
      tamanho_tipo: f.tamanho_tipo.trim() || null,
      faca_nova: Boolean(f.faca_nova),
      valor_faca: Math.max(0, Number(f.valor_faca) || 0),
      prazo_faca_dias: f.prazo_faca_dias === '' ? null : Number(f.prazo_faca_dias),
    })),
    ...(() => {
      const s = scalarsFromFacas(form.facas);
      return {
        faca_nova: s.faca_nova,
        formato_faca: s.formato_faca || null,
        valor_faca_nova: s.valor_faca_nova,
        prazo_faca_dias: s.prazo_faca_dias === '' ? null : s.prazo_faca_dias,
        faca_colunas_mapa: s.faca_colunas_mapa.trim() || null,
        faca_posicao: s.faca_posicao || null,
        faca_contorno_svg: s.faca_contorno_svg.trim() || null,
        faca_diametro_cm:
          s.faca_diametro_cm === '' ? null : Number(s.faca_diametro_cm) || null,
        faca_tamanho_raw: s.faca_tamanho_raw.trim() || null,
        faca_tamanho_tipo: s.faca_tamanho_tipo.trim() || null,
      };
    })(),
    condicao_pagamento: form.condicao_pagamento.trim() || null,
    forma_pagamento: form.forma_pagamento.trim() || null,
    vendedor_parceiro_id: form.vendedor_parceiro_id === '' ? null : form.vendedor_parceiro_id,
    modo_entrega: form.modo_entrega,
    valor_frete_manual:
      modoComFrete(form.modo_entrega) && form.valor_frete_manual !== ''
        ? form.valor_frete_manual
        : null,
    overrides: overridesForApi(form.overrides),
  };
}

export function displaySnap(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}
