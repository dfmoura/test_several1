/** Vocabulário visual canônico. Formatos e máquinas extras vêm do mapa/catálogo da EMP. */
export const FORMATOS_CANONICOS = [
  'RETA',
  'REDONDA',
  'OVAL',
  'DESENHADA',
  'ESPECIAL',
  'LACRE',
] as const;

export function mergeVocabulario(...listas: Array<readonly string[] | string[] | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const lista of listas) {
    for (const item of lista ?? []) {
      const v = item.trim().toUpperCase();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Item do mapa — campos usados na ficha impressa e no agrupamento. */
export type FacaMapaItem = {
  id: number;
  medida: string;
  formato: string;
  faca?: string | null;
  puxada?: number | null;
  z?: number | null;
  repeticao?: number | null;
  maquina_catalogo?: string | null;
  largura_faca?: number | null;
  diametro_cm?: number | null;
  n_facas?: number | null;
  cilindro?: string | null;
  posicao?: string | null;
  colunas_mapa?: string | null;
  contorno_svg?: string | null;
  tamanho_tipo?: string | null;
  cliente_nota?: string | null;
  obs?: string | null;
  completa: boolean;
  ativo: boolean;
  label?: string | null;
};

export type FacaMapaGrupoMaquina = {
  /** Chave canônica (UPPER); vazio = sem máquina. */
  maquina: string;
  label: string;
  items: FacaMapaItem[];
};

export type MapaFacasFichaFiltros = {
  q?: string;
  formato?: string;
  maquina?: string;
  soCompletas?: boolean;
  incluirInativas?: boolean;
};

function nFacasSortKey(v: number | null | undefined): number {
  if (v == null) return Number.POSITIVE_INFINITY;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

/** Ordenação canônica da ficha: N da faca → medida → id. Sem N vai ao fim do grupo. */
export function compareFacaMapaParaFicha(a: FacaMapaItem, b: FacaMapaItem): number {
  const naOk = nFacasSortKey(a.n_facas);
  const nbOk = nFacasSortKey(b.n_facas);
  if (naOk !== nbOk) return naOk - nbOk;

  const medida = String(a.medida ?? '').localeCompare(String(b.medida ?? ''), 'pt-BR', {
    sensitivity: 'base',
    numeric: true,
  });
  if (medida !== 0) return medida;

  return (a.id ?? 0) - (b.id ?? 0);
}

/**
 * Agrupa por `maquina_catalogo` (UPPER), ordena máquinas A→Z,
 * bloco "Sem máquina" por último; dentro de cada grupo ordena por N da faca.
 */
export function agruparFacasPorMaquina(items: readonly FacaMapaItem[]): FacaMapaGrupoMaquina[] {
  const map = new Map<string, FacaMapaItem[]>();

  for (const f of items) {
    const key = String(f.maquina_catalogo ?? '')
      .trim()
      .toUpperCase();
    const list = map.get(key);
    if (list) list.push(f);
    else map.set(key, [f]);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
  });

  return keys.map((key) => {
    const groupItems = [...(map.get(key) ?? [])].sort(compareFacaMapaParaFicha);
    return {
      maquina: key,
      label: key === '' ? 'Sem máquina' : key,
      items: groupItems,
    };
  });
}

/** Path satélite da ficha, preservando o recorte atual da tela. */
export function buildMapaFacasFichaPath(filters: MapaFacasFichaFiltros = {}): string {
  const qs = new URLSearchParams();
  if (filters.q?.trim()) qs.set('q', filters.q.trim());
  if (filters.formato?.trim()) qs.set('formato', filters.formato.trim());
  if (filters.maquina?.trim()) qs.set('maquina', filters.maquina.trim());
  if (filters.soCompletas) qs.set('so_completas', '1');
  if (filters.incluirInativas) qs.set('incluir_inativas', '1');
  const s = qs.toString();
  return s ? `/mapa-facas/ficha?${s}` : '/mapa-facas/ficha';
}

export function parseMapaFacasFichaFiltros(
  searchParams: URLSearchParams,
): MapaFacasFichaFiltros {
  return {
    q: searchParams.get('q')?.trim() || undefined,
    formato: searchParams.get('formato')?.trim() || undefined,
    maquina: searchParams.get('maquina')?.trim() || undefined,
    soCompletas:
      searchParams.get('so_completas') === '1' ||
      searchParams.get('so_completas') === 'true',
    incluirInativas:
      searchParams.get('incluir_inativas') === '1' ||
      searchParams.get('incluir_inativas') === 'true',
  };
}

export function descricaoRecorteMapaFacas(filters: MapaFacasFichaFiltros): string {
  const partes: string[] = [];
  if (filters.incluirInativas) partes.push('Ativas e inativas');
  else partes.push('Só ativas');
  if (filters.soCompletas) partes.push('só completas');
  if (filters.maquina) partes.push(`máquina ${filters.maquina}`);
  if (filters.formato) partes.push(`formato ${filters.formato}`);
  if (filters.q) partes.push(`busca “${filters.q}”`);
  return partes.join(' · ');
}
