/**
 * Visibilidade dos campos dimensionais (bobina) no cadastro de produto.
 *
 * Fonte de verdade (ADR-039-UNID-001 · ADR-043-CAD-001):
 *  1. `produto_grupos.exige_dimensao_sku` — oferece dimensões **nominais** (não identidade L×C do SKU)
 *  2. Motor `FatorConversaoSugeridor` pediu explicitamente esses atributos
 *  3. Valores já gravados (edição / legado) — para não sumir com dado existente
 *
 * Dimensão real da bobina = volume na entrada. Proibido: heurística por unidade KG/M/M2.
 */

export const BOBINA_DIM_KEYS = ['largura_mm', 'comprimento_m', 'gramatura_g_m2'] as const;

export type BobinaDimKey = (typeof BOBINA_DIM_KEYS)[number];

export type BobinaDimensoesUi = {
  showSection: boolean;
  /** Título da seção — nunca “bobina” se o grupo não exige máscara. */
  title: string;
  showLargura: boolean;
  showComprimento: boolean;
  showGramatura: boolean;
  mode: 'oculto' | 'grupo' | 'formula' | 'legado';
};

function hasValue(v: string | null | undefined): boolean {
  return v != null && String(v).trim() !== '';
}

function isBobinaKey(k: string): k is BobinaDimKey {
  return (BOBINA_DIM_KEYS as readonly string[]).includes(k);
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
}): BobinaDimensoesUi {
  const oculto: BobinaDimensoesUi = {
    showSection: false,
    title: '',
    showLargura: false,
    showComprimento: false,
    showGramatura: false,
    mode: 'oculto',
  };

  const filled = {
    largura_mm: hasValue(input.larguraMm),
    comprimento_m: hasValue(input.comprimentoM),
    gramatura_g_m2: hasValue(input.gramaturaGm2),
  };

  if (input.exigeDimensaoSku) {
    return {
      showSection: true,
      title: 'Dimensões nominais (referência de compra / conversão)',
      showLargura: true,
      showComprimento: true,
      showGramatura: true,
      mode: 'grupo',
    };
  }

  const faltandoBobina = (input.faltando ?? []).filter(isBobinaKey);
  if (faltandoBobina.length > 0) {
    return {
      showSection: true,
      title: 'Dados para conversão',
      showLargura: faltandoBobina.includes('largura_mm') || filled.largura_mm,
      showComprimento: faltandoBobina.includes('comprimento_m') || filled.comprimento_m,
      showGramatura: faltandoBobina.includes('gramatura_g_m2') || filled.gramatura_g_m2,
      mode: 'formula',
    };
  }

  // Legado / anomalia: grupo não exige, mas o SKU já tem dimensão gravada.
  if (filled.largura_mm || filled.comprimento_m || filled.gramatura_g_m2) {
    return {
      showSection: true,
      title: 'Dados dimensionais (gravados)',
      showLargura: filled.largura_mm,
      showComprimento: filled.comprimento_m,
      showGramatura: filled.gramatura_g_m2,
      mode: 'legado',
    };
  }

  return oculto;
}
