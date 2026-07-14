interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { [key: string]: unknown }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado.',
}: Props<T>) {
  if (data.length === 0) {
    return (
      <div className="card px-4 py-12 text-center text-sm text-slate-500 sm:px-6">{emptyMessage}</div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-3 py-3 font-medium text-slate-600 sm:px-4 ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer transition hover:bg-slate-50' : ''}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-3 text-slate-700 sm:px-4 ${col.className ?? ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
