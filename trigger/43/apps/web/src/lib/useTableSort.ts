import { useCallback, useMemo, useRef, useState } from 'react';

export type SortDir = 'asc' | 'desc';

/** Um critério da cadeia (1º, 2º, …). */
export type SortSpec = { key: string; dir: SortDir };

/** Clique no cabeçalho: Shift soma/tira critério (Excel / grade profissional). */
export type SortGesture = { shiftKey?: boolean };

/** Valores aceitos pelos getters de coluna. */
export type Comparable = string | number | boolean | null | undefined | Date;

export type SortGetters<T> = Record<string, (row: T) => Comparable>;

function toSortable(value: Comparable): string | number | boolean | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // ISO / datetime do backend — ordena cronologicamente
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const t = Date.parse(trimmed);
    if (!Number.isNaN(t)) return t;
  }
  return trimmed;
}

/** Comparação estável: null/vazio por último; números; booleans; strings pt-BR numeric. */
export function compareComparable(a: Comparable, b: Comparable): number {
  const av = toSortable(a);
  const bv = toSortable(b);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  if (typeof av === 'boolean' && typeof bv === 'boolean') return Number(av) - Number(bv);
  if (typeof av === 'boolean' || typeof bv === 'boolean') {
    return Number(Boolean(av)) - Number(Boolean(bv));
  }

  return String(av).localeCompare(String(bv), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
}

function isAdditive(gesture?: SortGesture | boolean): boolean {
  if (typeof gesture === 'boolean') return gesture;
  return Boolean(gesture?.shiftKey);
}

/**
 * Clique: substitui a cadeia (1º clique = asc; mesma coluna alterna).
 * Shift+clique: soma critério; na coluna já presente, asc → desc → tira (se houver outros).
 */
export function nextSorts(
  prev: readonly SortSpec[],
  column: string,
  additive: boolean,
): SortSpec[] {
  const idx = prev.findIndex((s) => s.key === column);

  if (!additive) {
    if (prev.length === 1 && idx === 0) {
      return [{ key: column, dir: prev[0].dir === 'asc' ? 'desc' : 'asc' }];
    }
    return [{ key: column, dir: 'asc' }];
  }

  if (idx === -1) {
    return [...prev, { key: column, dir: 'asc' }];
  }

  const cur = prev[idx];
  if (cur.dir === 'asc') {
    return prev.map((s, i) => (i === idx ? { key: s.key, dir: 'desc' as const } : s));
  }

  if (prev.length === 1) {
    return [{ key: column, dir: 'asc' }];
  }

  return prev.filter((_, i) => i !== idx);
}

export function sortRows<T>(
  rows: readonly T[],
  sorts: readonly SortSpec[],
  getters: SortGetters<T>,
): T[] {
  if (!sorts.length) return rows.slice();
  return rows.slice().sort((ra, rb) => {
    for (const spec of sorts) {
      const get = getters[spec.key];
      if (!get) continue;
      const c = compareComparable(get(ra), get(rb));
      if (c !== 0) return spec.dir === 'asc' ? c : -c;
    }
    return 0;
  });
}

export type TableSortState = {
  sorts: SortSpec[];
  /** Primeiro critério — compatível com telas que ainda leem um único eixo. */
  sortKey: string | null;
  sortDir: SortDir;
  requestSort: (column: string, gesture?: SortGesture | boolean) => void;
};

function initialSorts(options?: {
  initialKey?: string | null;
  initialDir?: SortDir;
  initialSorts?: SortSpec[];
}): SortSpec[] {
  if (options?.initialSorts?.length) return options.initialSorts;
  if (options?.initialKey) {
    return [{ key: options.initialKey, dir: options.initialDir ?? 'asc' }];
  }
  return [];
}

/**
 * Ordenação client-side para listagens já materializadas (sem paginação server-side).
 * Clique = um critério; Shift+clique = soma (desempate), no padrão de grade profissional.
 */
export function useTableSort<T>(
  rows: readonly T[],
  getters: SortGetters<T>,
  options?: { initialKey?: string | null; initialDir?: SortDir; initialSorts?: SortSpec[] },
): TableSortState & { sorted: T[] } {
  const [sorts, setSorts] = useState<SortSpec[]>(() => initialSorts(options));
  const gettersRef = useRef(getters);
  gettersRef.current = getters;

  const sorted = useMemo(
    () => sortRows(rows, sorts, gettersRef.current),
    [rows, sorts],
  );

  const requestSort = useCallback((column: string, gesture?: SortGesture | boolean) => {
    setSorts((prev) => nextSorts(prev, column, isAdditive(gesture)));
  }, []);

  return {
    sorted,
    sorts,
    sortKey: sorts[0]?.key ?? null,
    sortDir: sorts[0]?.dir ?? 'asc',
    requestSort,
  };
}
