/**
 * Progressive disclosure da superfície de conversão (ADR-039-UNID-001).
 *
 * Modelo dual permanece no schema para todo SKU.
 * Fator / equação / jargão de conversão só quando comercial ≠ estoque.
 * Gate de bobina é outro helper (`produtoBobinaDimensoesUi`) — não misturar.
 */

export type UnidadesConversaoUi = {
  mode: 'simples' | 'conversao';
  sectionTitle: string;
  /** Campo fator + hints do motor. */
  showFator: boolean;
  /** Lead com convenção `1 comercial = fator × interna`. */
  showEquacao: boolean;
};

export function unidadesDiferem(
  unidadeComercial: string | null | undefined,
  unidadeInterna: string | null | undefined,
): boolean {
  const a = (unidadeComercial ?? '').trim().toUpperCase();
  const b = (unidadeInterna ?? '').trim().toUpperCase();
  // Interna vazia = "mesma da comercial" (normalização no backend).
  return a !== '' && b !== '' && a !== b;
}

export function decideUnidadesConversaoUi(input: {
  unidadeComercial: string | null | undefined;
  unidadeInterna: string | null | undefined;
}): UnidadesConversaoUi {
  if (unidadesDiferem(input.unidadeComercial, input.unidadeInterna)) {
    return {
      mode: 'conversao',
      sectionTitle: 'Unidades e conversão',
      showFator: true,
      showEquacao: true,
    };
  }

  return {
    mode: 'simples',
    sectionTitle: 'Unidades',
    showFator: false,
    showEquacao: false,
  };
}
