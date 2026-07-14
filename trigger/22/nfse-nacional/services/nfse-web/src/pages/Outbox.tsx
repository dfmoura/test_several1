import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { api, formatDate } from '@/lib/api';

interface OutboxRow {
  id: string;
  eventType: string;
  published: boolean;
  createdAt: string;
}

export function Outbox() {
  const [data, setData] = useState<{ total: number; items: OutboxRow[] } | null>(null);
  const [filtro, setFiltro] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const published = filtro === '' ? undefined : filtro === 'true';
    api.outbox(100, 0, published).then(setData).finally(() => setLoading(false));
  };

  useEffect(load, [filtro]);

  return (
    <>
      <PageHeader title="Outbox" subtitle="Eventos de integração pendentes e publicados" />

      <div className="filter-toolbar">
        <select className="input w-full sm:max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="false">Pendentes</option>
          <option value="true">Publicados</option>
        </select>
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={load}>Atualizar</button>
      </div>

      {loading || !data ? (
        <Loading />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{data.total} evento(s)</p>
          <DataTable
            data={data.items}
            columns={[
              { key: 'type', header: 'Tipo', render: (r) => <span className="font-medium">{r.eventType}</span> },
              { key: 'pub', header: 'Publicado', render: (r) => <StatusBadge value={r.published ? 'REGISTRADO' : 'RASCUNHO'} /> },
              { key: 'created', header: 'Criado em', render: (r) => formatDate(r.createdAt) },
            ]}
          />
        </>
      )}
    </>
  );
}
