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
 * UI edita quantidades por faixa; `percentual` persiste no snapshot (Σ = 100) para PED/OP.
 */
export type ModeloComposicaoForm = {
  ordem: number;
  nome: string;
  percentual: number;
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
  colunas: number;
  etiq_por_rolo: number;
  tubete: string;
  z: number | '';
  maquina: string;
  imposto_pct: number;
  matriz: 'SIM' | 'NAO';
  coluna_rebobinacao: number;
  tipo_troca_produto: string;
  rpm: number;
  faixas: FaixaForm[];
  prazo_entrega_dias: number;
  validade_dias: number;
  tolerancia_qtd_pct: number;
  observacao: string;
  faca_nova: boolean;
  formato_faca: string;
  valor_faca_nova: number;
  prazo_faca_dias: number | '';
  /** Visual da faca no mapa — snapshot; não entra no motor R1–R20 */
  faca_colunas_mapa: string;
  faca_posicao: FacaPosicaoCodigo | '';
  faca_contorno_svg: string;
  faca_diametro_cm: number | '';
  faca_tamanho_tipo: string;
  /** Snapshot comercial desta proposta (defaults do PAR; não altera o motor). */
  condicao_pagamento: string;
  forma_pagamento: string;
  /** PAR papel vendedor — define % e quem recebe COM- após a baixa. */
  vendedor_parceiro_id: number | '';
  /** Fechamento: Retirar (padrão) × Entregar — ADR_ORC_FRETE_ESTIMADO. */
  modo_entrega: 'RETIRAR' | 'ENTREGAR';
  /** Só em Entregar. Padrão Calculada (catálogo). */
  origem_frete: 'CALCULADA' | 'MANUAL';
  /** R$ único da proposta quando origem Manual. Vazio = não informado. */
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
  frete?: {
    peso_caixa_kg?: string | number | null;
    faixas?: Array<{
      kg_ate: string | number | null;
      acima: boolean;
      preco_por_km: string | number | null;
      minimo_rs: string | number | null;
    }>;
  };
};

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
    });
  }
  return out;
}

export function somaPercentualModelos(rows: ModeloComposicaoForm[]): number {
  return Math.round(rows.reduce((s, r) => s + (Number(r.percentual) || 0), 0) * 10000) / 10000;
}

/** Matriz [faixaIdx][modeloIdx] — quantidade inteira alocada por arte. */
export function matrizQuantidadesModelos(
  faixas: FaixaForm[],
  rows: ModeloComposicaoForm[],
): number[][] {
  return faixas.map((f) =>
    alocarQuantidadePorModelo(f.quantidade, rows).map((r) => r.quantidade),
  );
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
  if (n === 1) {
    return prev.map((m, i) => (i === 0 ? { ...m, percentual: 100 } : m));
  }

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

  return prev.map((m, i) => ({ ...m, percentual: pcts[i] ?? m.percentual }));
}

/**
 * Aplica edição de quantidade numa célula (faixa × modelo).
 * O último modelo absorve o resto para fechar o total da faixa.
 */
export function aplicarQuantidadeModeloFaixa(
  composicao: ModeloComposicaoForm[],
  faixas: FaixaForm[],
  faixaIdx: number,
  modeloIdx: number,
  newQtd: number,
): ModeloComposicaoForm[] {
  const faixaTotal = Math.max(0, Math.floor(faixas[faixaIdx]?.quantidade) || 0);
  const n = composicao.length;
  const current = alocarQuantidadePorModelo(faixaTotal, composicao);
  const qs = current.map((r) => r.quantidade);
  qs[modeloIdx] = Math.max(0, Math.floor(newQtd) || 0);

  if (n === 1) {
    qs[0] = faixaTotal;
  } else if (modeloIdx !== n - 1) {
    const sumOthers = qs.slice(0, n - 1).reduce((s, q) => s + q, 0);
    qs[n - 1] = Math.max(0, faixaTotal - sumOthers);
  }

  return composicaoFromQuantidadesFaixa(composicao, qs, faixaTotal);
}

/** Mensagem de validação da composição; null se OK. */
export function validarModelosComposicao(
  modelos: number,
  rows: ModeloComposicaoForm[],
  faixas?: FaixaForm[],
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
  }
  const soma = somaPercentualModelos(rows);
  if (Math.abs(soma - 100) > 0.01) {
    return `A distribuição entre modelos deve fechar o total de cada faixa.`;
  }

  if (faixas && faixas.length > 0) {
    for (let fi = 0; fi < faixas.length; fi++) {
      const fq = Math.floor(faixas[fi]?.quantidade) || 0;
      if (fq <= 0) continue;
      const aloc = alocarQuantidadePorModelo(fq, rows);
      const somaQtd = aloc.reduce((s, r) => s + r.quantidade, 0);
      if (somaQtd !== fq) {
        return `Faixa ${fi + 1}: soma dos modelos (${somaQtd.toLocaleString('pt-BR')}) difere do total (${fq.toLocaleString('pt-BR')}).`;
      }
      for (let mi = 0; mi < aloc.length; mi++) {
        if (aloc[mi].quantidade <= 0) {
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
    colunas: 1,
    etiq_por_rolo: 1000,
    tubete: '1"',
    z: '',
    maquina: maquinas[0] ?? 'BETA',
    imposto_pct: catalog?.imposto_pct_default ?? 16,
    matriz: 'SIM',
    coluna_rebobinacao: 1,
    tipo_troca_produto: tipos[0] ?? 'SEM PARADA',
    rpm: 1000,
    faixas: [
      { quantidade: 5000, comissao_pct: 3 },
      { quantidade: 10000, comissao_pct: 2.5 },
      { quantidade: 20000, comissao_pct: 2 },
    ],
    prazo_entrega_dias: 12,
    validade_dias: 7,
    tolerancia_qtd_pct: 20,
    observacao: '',
    faca_nova: false,
    formato_faca: '',
    valor_faca_nova: 0,
    prazo_faca_dias: '',
    faca_colunas_mapa: '',
    faca_posicao: '',
    faca_contorno_svg: '',
    faca_diametro_cm: '',
    faca_tamanho_tipo: '',
    condicao_pagamento: '',
    forma_pagamento: '',
    vendedor_parceiro_id: '',
    modo_entrega: 'RETIRAR',
    origem_frete: 'CALCULADA',
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
        }))
      : syncModelosComposicao(compRaw, modelos);

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
    colunas: Number(snap.colunas) || 1,
    etiq_por_rolo: Number(snap.etiq_por_rolo) || 1000,
    tubete: String(snap.tubete ?? base.tubete),
    z: snap.z == null || snap.z === '' ? '' : Number(snap.z),
    maquina: String(snap.maquina ?? base.maquina),
    imposto_pct: Number(snap.imposto_pct) || base.imposto_pct,
    matriz: String(snap.matriz) === 'NAO' ? 'NAO' : 'SIM',
    coluna_rebobinacao: Number(snap.coluna_rebobinacao) || 1,
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
    faca_tamanho_tipo: String(snap.faca_tamanho_tipo ?? snap.tamanho_tipo ?? ''),
    condicao_pagamento: String(snap.condicao_pagamento ?? ''),
    forma_pagamento: String(snap.forma_pagamento ?? ''),
    vendedor_parceiro_id:
      snap.vendedor_parceiro_id == null || snap.vendedor_parceiro_id === ''
        ? ''
        : Number(snap.vendedor_parceiro_id),
    modo_entrega: String(snap.modo_entrega).toUpperCase() === 'ENTREGAR' ? 'ENTREGAR' : 'RETIRAR',
    origem_frete: String(snap.origem_frete).toUpperCase() === 'MANUAL' ? 'MANUAL' : 'CALCULADA',
    valor_frete_manual:
      snap.valor_frete_manual == null || snap.valor_frete_manual === ''
        ? ''
        : Number(snap.valor_frete_manual),
    overrides: parseOverridesFromSnap(snap.overrides),
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
      condicao_pagamento: form.condicao_pagamento.trim() || null,
      forma_pagamento: form.forma_pagamento.trim() || null,
      vendedor_parceiro_id: form.vendedor_parceiro_id === '' ? null : form.vendedor_parceiro_id,
      modo_entrega: form.modo_entrega === 'ENTREGAR' ? 'ENTREGAR' : 'RETIRAR',
      origem_frete:
        form.modo_entrega === 'ENTREGAR'
          ? form.origem_frete === 'MANUAL'
            ? 'MANUAL'
            : 'CALCULADA'
          : null,
      valor_frete_manual:
        form.modo_entrega === 'ENTREGAR' && form.origem_frete === 'MANUAL' && form.valor_frete_manual !== ''
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
    modelos_composicao: form.modelos_composicao.map((m, i) => ({
      ordem: i + 1,
      nome: m.nome.trim(),
      percentual: Number(m.percentual) || 0,
    })),
    colunas: form.colunas,
    etiq_por_rolo: form.etiq_por_rolo,
    tubete: form.tubete,
    z: form.z === '' ? null : form.z,
    maquina: form.maquina,
    imposto_pct: form.imposto_pct,
    matriz: form.matriz,
    coluna_rebobinacao: form.coluna_rebobinacao,
    tipo_troca_produto: form.tipo_troca_produto,
    rpm: form.rpm,
    faixas: form.faixas,
    prazo_entrega_dias: form.prazo_entrega_dias,
    validade_dias: form.validade_dias,
    tolerancia_qtd_pct: form.tolerancia_qtd_pct,
    observacao: form.observacao || null,
    faca_nova: form.faca_nova,
    formato_faca: form.formato_faca || null,
    valor_faca_nova: form.faca_nova ? form.valor_faca_nova : 0,
    prazo_faca_dias: form.faca_nova
      ? form.prazo_faca_dias === ''
        ? null
        : form.prazo_faca_dias
      : null,
    faca_colunas_mapa: form.faca_colunas_mapa.trim() || null,
    faca_posicao: form.faca_posicao || null,
    faca_contorno_svg: form.faca_contorno_svg.trim() || null,
    faca_diametro_cm:
      form.faca_diametro_cm === '' ? null : Number(form.faca_diametro_cm) || null,
    faca_tamanho_tipo: form.faca_tamanho_tipo.trim() || null,
    condicao_pagamento: form.condicao_pagamento.trim() || null,
    forma_pagamento: form.forma_pagamento.trim() || null,
    vendedor_parceiro_id: form.vendedor_parceiro_id === '' ? null : form.vendedor_parceiro_id,
    modo_entrega: form.modo_entrega === 'ENTREGAR' ? 'ENTREGAR' : 'RETIRAR',
    origem_frete:
      form.modo_entrega === 'ENTREGAR'
        ? form.origem_frete === 'MANUAL'
          ? 'MANUAL'
          : 'CALCULADA'
        : null,
    valor_frete_manual:
      form.modo_entrega === 'ENTREGAR' && form.origem_frete === 'MANUAL' && form.valor_frete_manual !== ''
        ? form.valor_frete_manual
        : null,
    overrides: overridesForApi(form.overrides),
  };
}

export function displaySnap(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}
