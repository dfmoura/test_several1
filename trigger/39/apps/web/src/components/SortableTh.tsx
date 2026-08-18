import type { ReactNode } from 'react';
import type { SortDir, SortGesture, SortSpec } from '../lib/useTableSort';

type Props = {
  column: string;
  /** Cadeia completa — necessário para o selo 1/2/3 na ordenação múltipla. */
  sorts?: readonly SortSpec[];
  sortKey?: string | null;
  sortDir?: SortDir;
  onSort: (column: string, gesture?: SortGesture) => void;
  children: ReactNode;
  className?: string;
  /** Texto acessível além do rótulo visível (opcional). */
  label?: string;
};

function chainFor(column: string, sorts?: readonly SortSpec[], sortKey?: string | null, sortDir?: SortDir) {
  if (sorts?.length) {
    const index = sorts.findIndex((s) => s.key === column);
    if (index < 0) return { active: false, dir: 'asc' as const, rank: 0, total: sorts.length };
    return { active: true, dir: sorts[index].dir, rank: index + 1, total: sorts.length };
  }
  const active = sortKey === column;
  return { active, dir: (sortDir ?? 'asc') as SortDir, rank: active ? 1 : 0, total: active ? 1 : 0 };
}

/**
 * Cabeçalho clicável com indicador de direção, rank na cadeia e aria-sort.
 * Clique substitui; Shift+clique soma critério. Colunas de ação / mídia ficam como &lt;th&gt; simples.
 */
export function SortableTh({
  column,
  sorts,
  sortKey,
  sortDir,
  onSort,
  children,
  className,
  label,
}: Props) {
  const { active, dir, rank, total } = chainFor(column, sorts, sortKey, sortDir);
  const multi = total > 1 && rank > 0;
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const classes = [
    'th-sortable',
    active ? `is-sorted is-sorted-${dir}` : '',
    multi && rank > 1 ? 'is-sorted-secondary' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const nome =
    label ?? (typeof children === 'string' ? children : 'coluna');

  const title = active
    ? multi
      ? dir === 'asc'
        ? `${rank}º critério, crescente — clique substitui · Shift+clique inverte ou tira`
        : `${rank}º critério, decrescente — clique substitui · Shift+clique tira`
      : dir === 'asc'
        ? 'Ordenado crescente — clique para decrescente · Shift+clique soma critério'
        : 'Ordenado decrescente — clique para crescente · Shift+clique soma critério'
    : 'Clique para ordenar · Shift+clique para somar critério';

  return (
    <th className={classes} scope="col" aria-sort={ariaSort}>
      <button
        type="button"
        className="th-sort-btn"
        onClick={(e) => onSort(column, { shiftKey: e.shiftKey })}
        title={title}
        aria-label={
          active
            ? multi
              ? `Ordenar por ${nome}, ${rank}º de ${total}, ${dir === 'asc' ? 'crescente' : 'decrescente'}. Shift+clique soma ou tira critério`
              : `Ordenar por ${nome}. Shift+clique soma critério`
            : `Ordenar por ${nome}. Shift+clique soma critério`
        }
      >
        <span className="th-sort-label">{children}</span>
        {multi ? (
          <span className="th-sort-rank" aria-hidden="true">
            {rank}
          </span>
        ) : null}
        <span className="th-sort-icon" aria-hidden="true" />
      </button>
    </th>
  );
}
