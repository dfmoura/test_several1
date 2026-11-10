/**
 * Visibilidade dos campos dimensionais (bobina) no cadastro de produto.
 *
 * Fonte de verdade (ADR-039-UNID-001 · ADR-043-CAD-001):
 *  1. `produto_grupos.exige_dimensao_sku` — oferece seção de dimensões **nominais** (não identidade L×C do SKU)
 *  2. Motor `FatorConversaoSugeridor` pediu explicitamente esses atributos
 *  3. Valores já gravados (edição / legado) — para não sumir com dado existente
 *  4. Progressive disclosure por perfil de grupo (Exact/variável vs largura que identifica)
 *
 * Dimensão real da bobina = volume na entrada. Proibido: heurística por unidade KG/M/M2.
 */

export const BOBINA_DIM_KEYS = ['largura_mm', 'comprimento_m', 'gramatura_g_m2'] as const;

export type BobinaDimKey = (typeof BOBINA_DIM_KEYS)[number];

/** L×C variam no volume — SKU = material/programa (Exact, filme, laminação, retalho, PA-BOB). */
export const GRUPOS_VOLUME_VARIAVEL = [
  'MP-PAP',
  'MP-FLM',
  'MP-LAM',
  'MP-RET',
  'PA-BOB',
] as const;

/** Largura identifica o material no SKU; comprimento real fica no volume. */
export const GRUPOS_LARGURA_IDENTIFICA = ['MP-TEC', 'MP-CLD', 'MP-ADF'] as const;

export type BobinaPerfilGrupo = 'volume_variavel' | 'largura_identifica' | 'desconhecido';

export type BobinaDimensoesUi = {
  showSection: boolean;
  /** Título da seção — nunca “bobina” se o grupo não exige máscara. */
  title: string;
  /** Programa comercial (Exact 1000…) — herói do SKU de bobina. */
  showPrograma: boolean;
  showLargura: boolean;
  showComprimento: boolean;
  showGramatura: boolean;
  mode: 'oculto' | 'grupo' | 'formula' | 'legado';
  perfil: BobinaPerfilGrupo | null;
  /** Há nominais ocultos; operador pode revelar sem mudar o modelo. */
  podeExpandirReferencia: boolean;
  /** Lead curto sob o título (UX). */
  hint: string;
};

function hasValue(v: string | null | undefined): boolean {
  return v != null && String(v).trim() !== '';
}

function isBobinaKey(k: string): k is BobinaDimKey {
  return (BOBINA_DIM_KEYS as readonly string[]).includes(k);
}

export function perfilBobinaDoGrupo(grupoCodigo?: string | null): BobinaPerfilGrupo {
  const g = (grupoCodigo || '').trim().toUpperCase();
  if ((GRUPOS_LARGURA_IDENTIFICA as readonly string[]).includes(g)) {
    return 'largura_identifica';
  }
  if ((GRUPOS_VOLUME_VARIAVEL as readonly string[]).includes(g)) {
    return 'volume_variavel';
  }
  // Grupo de bobina sem classificação explícita → caminho seguro (não delimitar L×C).
  return 'desconhecido';
}

/**
 * Decide se a seção e cada campo aparecem.
 * Função pura — fácil de revisar e travar em teste de arquitetura (espelho PHP).
 */
export function decideBobinaDimensoesUi(input: {
  exigeDimensaoSku: boolean;
  larguraMm?: string | null;
  comprimentoM?: string | null;
  gramaturaGm2?: string | null;
  faltando?: string[];
  /** Código canônico do grupo (MP-PAP…). Afina progressive disclosure. */
  grupoCodigo?: string | null;
  /** Operador pediu ver referência nominal completa. */
  expandirReferencia?: boolean;
}): BobinaDimensoesUi {
  const oculto: BobinaDimensoesUi = {
    showSection: false,
    title: '',
    showPrograma: false,
    showLargura: false,
    showComprimento: false,
    showGramatura: false,
    mode: 'oculto',
    perfil: null,
    podeExpandirReferencia: false,
    hint: '',
  };

  const filled = {
    largura_mm: hasValue(input.larguraMm),
    comprimento_m: hasValue(input.comprimentoM),
    gramatura_g_m2: hasValue(input.gramaturaGm2),
  };

  const faltandoBobina = (input.faltando ?? []).filter(isBobinaKey);
  const need = {
    largura_mm: faltandoBobina.includes('largura_mm') || filled.largura_mm,
    comprimento_m: faltandoBobina.includes('comprimento_m') || filled.comprimento_m,
    gramatura_g_m2: faltandoBobina.includes('gramatura_g_m2') || filled.gramatura_g_m2,
  };
  const expandir = Boolean(input.expandirReferencia);

  if (input.exigeDimensaoSku) {
    const perfil = perfilBobinaDoGrupo(input.grupoCodigo);
    const defaultLargura = perfil === 'largura_identifica';

    const showLargura = defaultLargura || need.largura_mm || expandir;
    const showComprimento = need.comprimento_m || expandir;
    const showGramatura = need.gramatura_g_m2 || expandir;

    const ocultaveis = [
      !defaultLargura && !need.largura_mm,
      !need.comprimento_m,
      !need.gramatura_g_m2,
    ];
    const podeExpandirReferencia = !expandir && ocultaveis.some(Boolean);

    const soPrograma = !showLargura && !showComprimento && !showGramatura;
    const title = soPrograma
      ? 'Material e programa (SKU)'
      : defaultLargura && !showComprimento && !showGramatura && !expandir
        ? 'Material no SKU'
        : 'Referência de compra / conversão';

    const hint =
      perfil === 'largura_identifica'
        ? 'A largura identifica o material neste SKU. Comprimento real e outras medidas ficam no volume (entrada) e nas faixas da OC.'
        : 'Um SKU por material/programa — várias medidas. Largura e comprimento reais entram na OC e em cada bobina na entrada; não delimite mm×m aqui.';

    return {
      showSection: true,
      title,
      showPrograma: true,
      showLargura,
      showComprimento,
      showGramatura,
      mode: 'grupo',
      perfil,
      podeExpandirReferencia,
      hint,
    };
  }

  if (faltandoBobina.length > 0) {
    return {
      showSection: true,
      title: 'Dados para conversão',
      showPrograma: false,
      showLargura: need.largura_mm,
      showComprimento: need.comprimento_m,
      showGramatura: need.gramatura_g_m2,
      mode: 'formula',
      perfil: null,
      podeExpandirReferencia: false,
      hint: 'Campos pedidos pelo fator quando unidade comercial ≠ estoque. Sem inventar número.',
    };
  }

  // Legado / anomalia: grupo não exige, mas o SKU já tem dimensão gravada.
  if (filled.largura_mm || filled.comprimento_m || filled.gramatura_g_m2) {
    return {
      showSection: true,
      title: 'Dados dimensionais (gravados)',
      showPrograma: false,
      showLargura: filled.largura_mm,
      showComprimento: filled.comprimento_m,
      showGramatura: filled.gramatura_g_m2,
      mode: 'legado',
      perfil: null,
      podeExpandirReferencia: false,
      hint: 'Valores já gravados neste SKU — ajuste só se a referência de conversão mudar.',
    };
  }

  return oculto;
}
