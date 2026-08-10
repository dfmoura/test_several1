import { useCallback, useMemo, useRef, useState } from 'react';

export type SortDir = 'asc' | 'desc';

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

export function sortRows<T>(
  rows: readonly T[],
  key: string | null,
  dir: SortDir,
  getters: SortGetters<T>,
): T[] {
  if (!key || !getters[key]) return rows.slice();
  const get = getters[key];
  const mul = dir === 'asc' ? 1 : -1;
  return rows.slice().sort((ra, rb) => {
    const c = compareComparable(get(ra), get(rb));
    return c === 0 ? 0 : c * mul;
  });
}

export type TableSortState = {
  sortKey: string | null;
  sortDir: SortDir;
  requestSort: (column: string) => void;
};

/**
 * Ordenação client-side para listagens já materializadas (sem paginação server-side).
 * 1º clique = asc; clique na mesma coluna alterna asc/desc.
 */
export function useTableSort<T>(
  rows: readonly T[],
  getters: SortGetters<T>,
  options?: { initialKey?: string | null; initialDir?: SortDir },
): TableSortState & { sorted: T[] } {
  const [sortKey, setSortKey] = useState<string | null>(options?.initialKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(options?.initialDir ?? 'asc');
  const gettersRef = useRef(getters);
  gettersRef.current = getters;

  const sorted = useMemo(
    () => sortRows(rows, sortKey, sortDir, gettersRef.current),
    [rows, sortKey, sortDir],
  );

  const requestSort = useCallback((column: string) => {
    setSortKey((prev) => {
      if (prev === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return column;
    });
  }, []);

  return { sorted, sortKey, sortDir, requestSort };
}
