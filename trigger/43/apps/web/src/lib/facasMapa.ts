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
  tamanho_raw?: string | null;
  tamanho_tipo?: string | null;
  cliente_nota?: string | null;
  obs?: string | null;
  completa: boolean;
  ativo: boolean;
  label?: string | null;
};

/** Fonte mínima para exibir Largura / Tamanho (átomos; `medida` só como fallback). */
export type FacaDimensoesFonte = {
  medida?: string | null;
  formato?: string | null;
  largura_faca?: number | null;
  diametro_cm?: number | null;
  tamanho_raw?: string | null;
  tamanho_tipo?: string | null;
};

export type FacaDimensoesExibicao = {
  largura: string;
  tamanho: string;
  isDiametro: boolean;
  /** Título composto (ex. `3,3 × 0,9` ou `11 × Ø 5`). */
  titulo: string;
  larguraSort: number | null;
  tamanhoSort: number | null;
};

function fmtDimensaoNum(n: number, maxFrac = 4): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: maxFrac });
}

function parseDimensaoLoose(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** REDONDA (e variantes) usam diâmetro no lugar de “tamanho” linear. */
export function formatoUsaDiametro(formato?: string | null): boolean {
  return String(formato ?? '')
    .trim()
    .toUpperCase()
    .startsWith('REDOND');
}

/**
 * Identidade persistida `medida` a partir dos átomos (cadastro Largura + Tamanho).
 * Mantém o padrão legado `8,0X12,4` / `Ø5` — motor, unicidade e ORC continuam no campo `medida`.
 */
export function composeMedidaIdentidade(opts: {
  larguraCm: number | null;
  tamanhoCm: number | null;
  isDiametro: boolean;
}): string {
  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { maximumFractionDigits: 4, useGrouping: false });
  if (opts.isDiametro) {
    const d = opts.tamanhoCm ?? opts.larguraCm;
    if (d == null || !(d > 0)) return '';
    return `Ø${fmt(d)}`;
  }
  if (opts.larguraCm == null || !(opts.larguraCm > 0)) return '';
  if (opts.tamanhoCm == null || !(opts.tamanhoCm > 0)) return '';
  return `${fmt(opts.larguraCm)}X${fmt(opts.tamanhoCm)}`;
}

/**
 * Apresentação canônica Largura × Tamanho a partir dos átomos do mapa.
 * `medida` permanece identidade persistida (ORC/unicidade) — aqui só fallback visual.
 */
export function facaDimensoesExibicao(f: FacaDimensoesFonte): FacaDimensoesExibicao {
  const isDiametro =
    formatoUsaDiametro(f.formato) ||
    String(f.tamanho_tipo ?? '')
      .trim()
      .toLowerCase()
      .startsWith('diam');

  let larguraSort = parseDimensaoLoose(f.largura_faca);
  let tamanhoSort: number | null = null;
  let tamanho = '—';

  if (isDiametro) {
    tamanhoSort = parseDimensaoLoose(f.diametro_cm);
    if (tamanhoSort == null) tamanhoSort = parseDimensaoLoose(f.tamanho_raw);
  } else {
    tamanhoSort = parseDimensaoLoose(f.tamanho_raw);
    if (tamanhoSort == null && f.tamanho_raw != null && String(f.tamanho_raw).trim() !== '') {
      tamanho = String(f.tamanho_raw).trim();
    }
  }

  if (larguraSort == null || (tamanhoSort == null && tamanho === '—')) {
    const medida = String(f.medida ?? '').trim();
    if (medida && /[xX×]/.test(medida)) {
      const parts = medida.split(/[xX×]/).map((p) => p.trim()).filter(Boolean);
      if (larguraSort == null && parts[0]) larguraSort = parseDimensaoLoose(parts[0]);
      if (tamanhoSort == null && parts[1]) {
        tamanhoSort = parseDimensaoLoose(parts[1]);
        if (tamanhoSort == null) tamanho = parts[1];
      }
    } else if (medida && isDiametro && tamanhoSort == null) {
      const limpa = medida.replace(/^[Øø]/, '').trim();
      tamanhoSort = parseDimensaoLoose(limpa);
      if (tamanhoSort == null) tamanho = limpa || medida;
    }
  }

  const largura = larguraSort != null ? fmtDimensaoNum(larguraSort, 2) : '—';
  if (tamanhoSort != null) tamanho = fmtDimensaoNum(tamanhoSort, 4);

  const titulo =
    largura === '—' && tamanho === '—'
      ? String(f.medida ?? '').trim() || '—'
      : isDiametro
        ? `${largura} × Ø ${tamanho}`
        : `${largura} × ${tamanho}`;

  return { largura, tamanho, isDiametro, titulo, larguraSort, tamanhoSort };
}

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

/** Ordenação canônica da ficha: N FACA → largura → tamanho → id. Sem N vai ao fim do grupo. */
export function compareFacaMapaParaFicha(a: FacaMapaItem, b: FacaMapaItem): number {
  const naOk = nFacasSortKey(a.n_facas);
  const nbOk = nFacasSortKey(b.n_facas);
  if (naOk !== nbOk) return naOk - nbOk;

  const da = facaDimensoesExibicao(a);
  const db = facaDimensoesExibicao(b);
  const la = da.larguraSort ?? Number.POSITIVE_INFINITY;
  const lb = db.larguraSort ?? Number.POSITIVE_INFINITY;
  if (la !== lb) return la - lb;

  const ta = da.tamanhoSort ?? Number.POSITIVE_INFINITY;
  const tb = db.tamanhoSort ?? Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;

  return (a.id ?? 0) - (b.id ?? 0);
}

/**
 * Agrupa por `maquina_catalogo` (UPPER), ordena máquinas A→Z,
 * bloco "Sem máquina" por último; dentro de cada grupo ordena por N FACA.
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
