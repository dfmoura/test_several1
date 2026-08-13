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
};

/** Arte / modelo operacional — % da quantidade do serviço (soma = 100). */
export type ModeloComposicaoForm = {
  ordem: number;
  nome: string;
  percentual: number;
};

export type OrcForm = {
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
  /** Snapshot comercial desta proposta (defaults do PAR; não altera o motor). */
  condicao_pagamento: string;
  forma_pagamento: string;
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

/** Mensagem de validação da composição; null se OK. */
export function validarModelosComposicao(
  modelos: number,
  rows: ModeloComposicaoForm[],
): string | null {
  const n = Math.max(1, Math.floor(modelos) || 1);
  if (rows.length !== n) {
    return `Detalhe exatamente ${n} modelo(s) (nome + % da quantidade).`;
  }
  for (let i = 0; i < rows.length; i++) {
    const nome = String(rows[i]?.nome ?? '').trim();
    if (!nome) {
      return `Informe o nome do modelo ${i + 1} (arte / referência).`;
    }
    const pct = Number(rows[i]?.percentual);
    if (!(pct > 0) || pct > 100) {
      return `Percentual do modelo ${i + 1} deve ser > 0 e ≤ 100.`;
    }
  }
  const soma = somaPercentualModelos(rows);
  if (Math.abs(soma - 100) > 0.01) {
    return `A soma dos % dos modelos deve ser 100% (atual: ${soma}%).`;
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
    condicao_pagamento: '',
    forma_pagamento: '',
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
    condicao_pagamento: String(snap.condicao_pagamento ?? ''),
    forma_pagamento: String(snap.forma_pagamento ?? ''),
  };
}

export function payloadFromForm(form: OrcForm): Record<string, unknown> {
  return {
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
    condicao_pagamento: form.condicao_pagamento.trim() || null,
    forma_pagamento: form.forma_pagamento.trim() || null,
  };
}

export function displaySnap(value: unknown): string {
  if (value == null || value === '') return '—';
  return String(value);
}
