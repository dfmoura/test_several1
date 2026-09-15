/**
 * Quando a OC / A repor oferece o “Detalhe do pedido” (faixas físicas L × volumes × m → m²).
 *
 * Fonte de verdade (ADR_OC_RASCUNHO_ENVIO · ADR_CADASTRO_INSUMO_VOLUME):
 *  1. `produto_grupos.exige_dimensao_sku` — grupos de substrato/bobina
 *  2. Fallback pelo código do grupo (espelho PHP `ProdutoBobinaDimensoes`)
 *  3. Legado: já existe composição gravada — não sumir o editor
 *
 * Tubete, caixa, tinta, ribbon etc. usam só `qtde_pedida` (un. comercial).
 * Proibido: abrir faixas por heurística de unidade (KG/M2/UN).
 * UX: painel mostra ponte Σ m² → qtde comercial (KG/M2/…) — faixas continuam físicas.
 */

/** Espelho de `ProdutoBobinaDimensoes::gruposQueExigemDimensao()`. */
export const OC_DETALHE_BOBINA_GRUPOS = [
  'MP-PAP',
  'MP-FLM',
  'MP-TEC',
  'MP-LAM',
  'MP-CLD',
  'MP-ADF',
  'MP-RET',
  'PA-BOB',
] as const;

export type OcPedidoDetalheUi = {
  /** Mostrar painel / botão “Detalhar”. */
  showDetalheBobina: boolean;
  mode: 'bobina' | 'oculto' | 'legado';
};

function normGrupo(codigo: string | null | undefined): string {
  return String(codigo ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Decide se a linha OC pode (e deve) expor composição de faixas.
 * Função pura — espelhada em `App\Support\OcPedidoDetalhe`.
 */
export function decideOcPedidoDetalheUi(input: {
  exigeDimensaoSku?: boolean | null;
  grupoCodigo?: string | null;
  /** Já há faixas no rascunho / OC (edição ou legado). */
  temComposicao?: boolean;
}): OcPedidoDetalheUi {
  if (input.temComposicao) {
    return { showDetalheBobina: true, mode: 'legado' };
  }

  if (input.exigeDimensaoSku === true) {
    return { showDetalheBobina: true, mode: 'bobina' };
  }

  // Flag explícita do catálogo prevalece sobre fallback de código.
  if (input.exigeDimensaoSku === false) {
    return { showDetalheBobina: false, mode: 'oculto' };
  }

  const g = normGrupo(input.grupoCodigo);
  if (
    g &&
    (OC_DETALHE_BOBINA_GRUPOS as readonly string[]).includes(g)
  ) {
    return { showDetalheBobina: true, mode: 'bobina' };
  }

  return { showDetalheBobina: false, mode: 'oculto' };
}

/** Atalho a partir do payload de produto / reposição. */
export function produtoPermiteDetalheBobinaOc(produto: {
  grupo?: string | null;
  grupo_catalogo?: { codigo?: string | null; exige_dimensao_sku?: boolean } | null;
  exige_dimensao_sku?: boolean | null;
} | null | undefined, temComposicao = false): boolean {
  if (!produto && !temComposicao) return false;
  return decideOcPedidoDetalheUi({
    exigeDimensaoSku:
      produto?.exige_dimensao_sku ??
      produto?.grupo_catalogo?.exige_dimensao_sku ??
      null,
    grupoCodigo: produto?.grupo_catalogo?.codigo ?? produto?.grupo ?? null,
    temComposicao,
  }).showDetalheBobina;
}
