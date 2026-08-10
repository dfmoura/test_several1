import type { ReactNode } from 'react';
import type { SortDir } from '../lib/useTableSort';

type Props = {
  column: string;
  sortKey: string | null;
  sortDir: SortDir;
  onSort: (column: string) => void;
  children: ReactNode;
  className?: string;
  /** Texto acessível além do rótulo visível (opcional). */
  label?: string;
};

/**
 * Cabeçalho clicável com indicador de direção e aria-sort.
 * Colunas de ação / mídia devem permanecer como &lt;th&gt; simples.
 */
export function SortableTh({
  column,
  sortKey,
  sortDir,
  onSort,
  children,
  className,
  label,
}: Props) {
  const active = sortKey === column;
  const ariaSort = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
  const classes = ['th-sortable', active ? `is-sorted is-sorted-${sortDir}` : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <th className={classes} scope="col" aria-sort={ariaSort}>
      <button
        type="button"
        className="th-sort-btn"
        onClick={() => onSort(column)}
        title={
          active
            ? sortDir === 'asc'
              ? 'Ordenado crescente — clique para decrescente'
              : 'Ordenado decrescente — clique para crescente'
            : 'Clique para ordenar'
        }
        aria-label={
          label
            ? `Ordenar por ${label}`
            : typeof children === 'string'
              ? `Ordenar por ${children}`
              : 'Ordenar coluna'
        }
      >
        <span className="th-sort-label">{children}</span>
        <span className="th-sort-icon" aria-hidden="true" />
      </button>
    </th>
  );
}
