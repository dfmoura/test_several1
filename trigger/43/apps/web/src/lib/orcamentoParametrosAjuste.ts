/**
 * Ajustes de parâmetro “ao seu entendimento” por ORC.
 * Reusa `input.overrides` + imposto_pct / comissao_pct — não altera o catálogo EMP.
 */

export type OrcOverrides = {
  papel?: Record<string, number>;
  acabamentos?: Record<string, number>;
  tubete?: Record<string, number>;
  hora_parada_h?: Record<string, number>;
  hora_maquina?: Record<string, Record<string, number>>;
  tinta_acima_m2?: number;
  tinta_faixa_m2?: number;
  tinta_valor_ate_30_por_cor?: number;
  preco_caixa?: number;
  minutos_troca_bobina?: number;
  limite_metragem_bobina?: number;
  matriz_cm2?: number;
  setup_horas?: number;
  ceiling_etiqueta?: number;
};

export type ParametroAjusteId =
  | 'papel'
  | 'maquina'
  | 'troca_produto'
  | 'troca_bobina'
  | 'tinta'
  | 'acabamento'
  | 'rebobinacao'
  | 'tubete'
  | 'caixa'
  | 'comissao'
  | 'imposto';

export type ParametroAjusteLinha = {
  id: ParametroAjusteId;
  label: string;
  /** O que o motor usa neste ORC (rótulo curto). */
  parametro: string;
  unidade: string;
  /** Valor efetivo no snapshot (já com override se houver). */
  valorUsado: number | null;
  /** Resultado R$ da linha de custo na faixa. */
  resultadoRs: number | null;
  /** Chave no draft local (string vazia = usar default). */
  draftKey: ParametroAjusteId;
};

export type TarifasResolvidas = {
  preco_papel?: number | null;
  papel?: string | null;
  taxa_hora_maquina?: number | null;
  maquina?: string | null;
  cores?: string | number | null;
  hora_parada_troca?: number | null;
  tipo_troca_produto?: string | null;
  minutos_troca_bobina?: number | null;
  limite_metragem_bobina?: number | null;
  tinta_faixa_m2?: number | null;
  tinta_valor_ate_30_por_cor?: number | null;
  tinta_acima_m2?: number | null;
  preco_acabamento?: number | null;
  acabamento?: string | null;
  preco_rebobinacao?: number | null;
  rebobinacao?: string | null;
  preco_tubete?: number | null;
  tubete?: string | null;
  preco_caixa?: number | null;
};

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function parseTarifasResolvidas(
  snapshot: Record<string, unknown> | undefined,
): TarifasResolvidas {
  const raw = snapshot?.tarifas_resolvidas;
  if (!raw || typeof raw !== 'object') return {};
  const t = raw as Record<string, unknown>;
  return {
    preco_papel: num(t.preco_papel),
    papel: t.papel != null ? String(t.papel) : null,
    taxa_hora_maquina: num(t.taxa_hora_maquina),
    maquina: t.maquina != null ? String(t.maquina) : null,
    cores: t.cores as string | number | null,
    hora_parada_troca: num(t.hora_parada_troca),
    tipo_troca_produto: t.tipo_troca_produto != null ? String(t.tipo_troca_produto) : null,
    minutos_troca_bobina: num(t.minutos_troca_bobina),
    limite_metragem_bobina: num(t.limite_metragem_bobina),
    tinta_faixa_m2: num(t.tinta_faixa_m2),
    tinta_valor_ate_30_por_cor: num(t.tinta_valor_ate_30_por_cor),
    tinta_acima_m2: num(t.tinta_acima_m2),
    preco_acabamento: num(t.preco_acabamento),
    acabamento: t.acabamento != null ? String(t.acabamento) : null,
    preco_rebobinacao: num(t.preco_rebobinacao),
    rebobinacao: t.rebobinacao != null ? String(t.rebobinacao) : null,
    preco_tubete: num(t.preco_tubete),
    tubete: t.tubete != null ? String(t.tubete) : null,
    preco_caixa: num(t.preco_caixa),
  };
}

export function buildParametrosAjusteLinhas(opts: {
  tarifas: TarifasResolvidas;
  detalhe: {
    valor_papel?: number;
    valor_maquina?: number;
    valor_troca_produto?: number;
    valor_troca_bobina?: number;
    valor_tinta?: number;
    valor_acabamento?: number;
    valor_rebobinacao?: number;
    valor_tubete?: number;
    valor_caixa?: number;
    comissao?: number;
    imposto?: number;
    m2?: number;
  };
  comissaoPct: number;
  impostoPct: number;
}): ParametroAjusteLinha[] {
  const { tarifas: t, detalhe: d, comissaoPct, impostoPct } = opts;
  const tintaUsaAcima =
    t.tinta_faixa_m2 != null && d.m2 != null ? Number(d.m2) > Number(t.tinta_faixa_m2) : true;

  return [
    {
      id: 'papel',
      label: 'Papel',
      parametro: t.papel ? `R$/m² · ${t.papel}` : 'R$/m² do papel',
      unidade: 'R$/m²',
      valorUsado: t.preco_papel ?? null,
      resultadoRs: num(d.valor_papel),
      draftKey: 'papel',
    },
    {
      id: 'maquina',
      label: 'Máquina',
      parametro: t.maquina
        ? `R$/h · ${t.maquina}${t.cores != null ? ` · ${t.cores} cores` : ''}`
        : 'R$/h máquina×cores',
      unidade: 'R$/h',
      valorUsado: t.taxa_hora_maquina ?? null,
      resultadoRs: num(d.valor_maquina),
      draftKey: 'maquina',
    },
    {
      id: 'troca_produto',
      label: 'Troca produto',
      parametro: t.tipo_troca_produto
        ? `h parada · ${t.tipo_troca_produto}`
        : 'h parada (tipo troca)',
      unidade: 'h',
      valorUsado: t.hora_parada_troca ?? null,
      resultadoRs: num(d.valor_troca_produto),
      draftKey: 'troca_produto',
    },
    {
      id: 'troca_bobina',
      label: 'Troca bobina',
      parametro: 'minutos por milhão m (R4)',
      unidade: 'min',
      valorUsado: t.minutos_troca_bobina ?? null,
      resultadoRs: num(d.valor_troca_bobina),
      draftKey: 'troca_bobina',
    },
    {
      id: 'tinta',
      label: 'Tinta',
      parametro: tintaUsaAcima
        ? 'R$/m² acima da faixa'
        : `R$ por cor (≤ ${t.tinta_faixa_m2 ?? '—'} m²)`,
      unidade: tintaUsaAcima ? 'R$/m²' : 'R$/cor',
      valorUsado: tintaUsaAcima
        ? (t.tinta_acima_m2 ?? null)
        : (t.tinta_valor_ate_30_por_cor ?? null),
      resultadoRs: num(d.valor_tinta),
      draftKey: 'tinta',
    },
    {
      id: 'acabamento',
      label: 'Acabamento',
      parametro: t.acabamento ? `R$/m² · ${t.acabamento}` : 'R$/m² acabamento',
      unidade: 'R$/m²',
      valorUsado: t.preco_acabamento ?? null,
      resultadoRs: num(d.valor_acabamento),
      draftKey: 'acabamento',
    },
    {
      id: 'rebobinacao',
      label: 'Rebobinação',
      parametro: t.rebobinacao ? `tarifa · ${t.rebobinacao}` : 'tarifa rebobinação',
      unidade: 'R$',
      valorUsado: t.preco_rebobinacao ?? null,
      resultadoRs: num(d.valor_rebobinacao),
      draftKey: 'rebobinacao',
    },
    {
      id: 'tubete',
      label: 'Tubete',
      parametro: t.tubete ? `R$/un · ${t.tubete}` : 'R$/tubete',
      unidade: 'R$/un',
      valorUsado: t.preco_tubete ?? null,
      resultadoRs: num(d.valor_tubete),
      draftKey: 'tubete',
    },
    {
      id: 'caixa',
      label: 'Caixa',
      parametro: 'R$/caixa',
      unidade: 'R$/cx',
      valorUsado: t.preco_caixa ?? null,
      resultadoRs: num(d.valor_caixa),
      draftKey: 'caixa',
    },
    {
      id: 'comissao',
      label: 'Comissão',
      parametro: '% sobre o serviço (faixa)',
      unidade: '%',
      valorUsado: comissaoPct,
      resultadoRs: num(d.comissao),
      draftKey: 'comissao',
    },
    {
      id: 'imposto',
      label: 'Imposto (est.)',
      parametro: '% estimado sobre o serviço',
      unidade: '%',
      valorUsado: impostoPct,
      resultadoRs: num(d.imposto),
      draftKey: 'imposto',
    },
  ];
}

/** Lê o valor já gravado em overrides / form para pré-preencher o draft. */
export function valorOverrideAtual(
  id: ParametroAjusteId,
  overrides: OrcOverrides | null | undefined,
  ctx: {
    papel: string;
    acabamento: string;
    maquina: string;
    cores: string;
    tubete: string;
    tipoTroca: string;
    rebobinacaoNome?: string;
    comissaoPct: number;
    impostoPct: number;
    tintaUsaAcima: boolean;
  },
): number | null {
  const o = overrides ?? {};
  const reb = ctx.rebobinacaoNome ?? 'REBOBINAÇÃO';
  switch (id) {
    case 'papel':
      return o.papel?.[ctx.papel] ?? null;
    case 'maquina':
      return o.hora_maquina?.[ctx.maquina]?.[ctx.cores] ?? null;
    case 'troca_produto':
      return o.hora_parada_h?.[ctx.tipoTroca] ?? null;
    case 'troca_bobina':
      return o.minutos_troca_bobina ?? null;
    case 'tinta':
      return ctx.tintaUsaAcima
        ? (o.tinta_acima_m2 ?? null)
        : (o.tinta_valor_ate_30_por_cor ?? null);
    case 'acabamento':
      return o.acabamentos?.[ctx.acabamento] ?? null;
    case 'rebobinacao':
      return o.acabamentos?.[reb] ?? null;
    case 'tubete':
      return o.tubete?.[ctx.tubete] ?? null;
    case 'caixa':
      return o.preco_caixa ?? null;
    case 'comissao':
      return ctx.comissaoPct;
    case 'imposto':
      return ctx.impostoPct;
    default:
      return null;
  }
}

export type AjusteAplicado = {
  overrides: OrcOverrides;
  imposto_pct: number;
  comissao_pct: number;
};

/**
 * Monta overrides + % a partir do draft (string vazia = remove override / mantém default do catálogo).
 * Comissão e imposto sempre vão para o form (não para overrides).
 */
export function aplicarDraftParametros(opts: {
  draft: Partial<Record<ParametroAjusteId, string>>;
  overridesBase: OrcOverrides;
  ctx: {
    papel: string;
    acabamento: string;
    maquina: string;
    cores: string;
    tubete: string;
    tipoTroca: string;
    rebobinacaoNome?: string;
    comissaoPct: number;
    impostoPct: number;
    tintaUsaAcima: boolean;
  };
}): AjusteAplicado {
  const reb = opts.ctx.rebobinacaoNome ?? 'REBOBINAÇÃO';
  const next: OrcOverrides = {
    ...opts.overridesBase,
    papel: { ...(opts.overridesBase.papel ?? {}) },
    acabamentos: { ...(opts.overridesBase.acabamentos ?? {}) },
    tubete: { ...(opts.overridesBase.tubete ?? {}) },
    hora_parada_h: { ...(opts.overridesBase.hora_parada_h ?? {}) },
    hora_maquina: {
      ...(opts.overridesBase.hora_maquina ?? {}),
      [opts.ctx.maquina]: {
        ...(opts.overridesBase.hora_maquina?.[opts.ctx.maquina] ?? {}),
      },
    },
  };

  const parseDraft = (id: ParametroAjusteId): { empty: boolean; n: number | null } => {
    if (!(id in opts.draft)) return { empty: false, n: null }; // não tocado
    const raw = String(opts.draft[id] ?? '').trim().replace(',', '.');
    if (raw === '') return { empty: true, n: null };
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { empty: false, n: null };
    return { empty: false, n };
  };

  const touched = (id: ParametroAjusteId) => id in opts.draft;

  if (touched('papel')) {
    const { empty, n } = parseDraft('papel');
    if (empty) delete next.papel![opts.ctx.papel];
    else if (n != null) next.papel![opts.ctx.papel] = n;
  }
  if (touched('maquina')) {
    const { empty, n } = parseDraft('maquina');
    if (empty) delete next.hora_maquina![opts.ctx.maquina][opts.ctx.cores];
    else if (n != null) next.hora_maquina![opts.ctx.maquina][opts.ctx.cores] = n;
  }
  if (touched('troca_produto')) {
    const { empty, n } = parseDraft('troca_produto');
    if (empty) delete next.hora_parada_h![opts.ctx.tipoTroca];
    else if (n != null) next.hora_parada_h![opts.ctx.tipoTroca] = n;
  }
  if (touched('troca_bobina')) {
    const { empty, n } = parseDraft('troca_bobina');
    if (empty) delete next.minutos_troca_bobina;
    else if (n != null) next.minutos_troca_bobina = n;
  }
  if (touched('tinta')) {
    const { empty, n } = parseDraft('tinta');
    if (opts.ctx.tintaUsaAcima) {
      if (empty) delete next.tinta_acima_m2;
      else if (n != null) next.tinta_acima_m2 = n;
    } else {
      if (empty) delete next.tinta_valor_ate_30_por_cor;
      else if (n != null) next.tinta_valor_ate_30_por_cor = n;
    }
  }
  if (touched('acabamento')) {
    const { empty, n } = parseDraft('acabamento');
    if (empty) delete next.acabamentos![opts.ctx.acabamento];
    else if (n != null) next.acabamentos![opts.ctx.acabamento] = n;
  }
  if (touched('rebobinacao')) {
    const { empty, n } = parseDraft('rebobinacao');
    if (empty) delete next.acabamentos![reb];
    else if (n != null) next.acabamentos![reb] = n;
  }
  if (touched('tubete')) {
    const { empty, n } = parseDraft('tubete');
    if (empty) delete next.tubete![opts.ctx.tubete];
    else if (n != null) next.tubete![opts.ctx.tubete] = n;
  }
  if (touched('caixa')) {
    const { empty, n } = parseDraft('caixa');
    if (empty) delete next.preco_caixa;
    else if (n != null) next.preco_caixa = n;
  }

  let imposto = opts.ctx.impostoPct;
  let comissao = opts.ctx.comissaoPct;
  if (touched('imposto')) {
    const { empty, n } = parseDraft('imposto');
    if (!empty && n != null) imposto = n;
  }
  if (touched('comissao')) {
    const { empty, n } = parseDraft('comissao');
    if (!empty && n != null) comissao = n;
  }

  // Limpa mapas vazios
  if (next.papel && Object.keys(next.papel).length === 0) delete next.papel;
  if (next.acabamentos && Object.keys(next.acabamentos).length === 0) delete next.acabamentos;
  if (next.tubete && Object.keys(next.tubete).length === 0) delete next.tubete;
  if (next.hora_parada_h && Object.keys(next.hora_parada_h).length === 0) delete next.hora_parada_h;
  if (next.hora_maquina) {
    const mq = next.hora_maquina[opts.ctx.maquina];
    if (mq && Object.keys(mq).length === 0) delete next.hora_maquina[opts.ctx.maquina];
    if (Object.keys(next.hora_maquina).length === 0) delete next.hora_maquina;
  }

  return { overrides: next, imposto_pct: imposto, comissao_pct: comissao };
}

/** Remove overrides vazios do payload da API. */
export function overridesForApi(o: OrcOverrides | null | undefined): OrcOverrides | null {
  if (!o) return null;
  const clean: OrcOverrides = {};
  let any = false;
  const copyNum = <K extends keyof OrcOverrides>(k: K, v: OrcOverrides[K]) => {
    if (v === undefined || v === null) return;
    (clean as Record<string, unknown>)[k] = v;
    any = true;
  };
  if (o.papel && Object.keys(o.papel).length) {
    copyNum('papel', o.papel);
  }
  if (o.acabamentos && Object.keys(o.acabamentos).length) {
    copyNum('acabamentos', o.acabamentos);
  }
  if (o.tubete && Object.keys(o.tubete).length) {
    copyNum('tubete', o.tubete);
  }
  if (o.hora_parada_h && Object.keys(o.hora_parada_h).length) {
    copyNum('hora_parada_h', o.hora_parada_h);
  }
  if (o.hora_maquina && Object.keys(o.hora_maquina).length) {
    copyNum('hora_maquina', o.hora_maquina);
  }
  for (const k of [
    'tinta_acima_m2',
    'tinta_faixa_m2',
    'tinta_valor_ate_30_por_cor',
    'preco_caixa',
    'minutos_troca_bobina',
    'limite_metragem_bobina',
    'matriz_cm2',
    'setup_horas',
    'ceiling_etiqueta',
  ] as const) {
    if (o[k] != null && Number.isFinite(Number(o[k]))) {
      copyNum(k, Number(o[k]) as never);
    }
  }
  return any ? clean : null;
}

export function parseOverridesFromSnap(raw: unknown): OrcOverrides {
  if (!raw || typeof raw !== 'object') return {};
  return { ...(raw as OrcOverrides) };
}
