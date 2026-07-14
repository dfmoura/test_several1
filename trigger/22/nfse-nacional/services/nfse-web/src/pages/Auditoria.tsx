import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Loading } from '@/components/Loading';
import { api, formatDate, truncate } from '@/lib/api';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  ip?: string;
  createdAt: string;
}

export function Auditoria() {
  const [data, setData] = useState<{ total: number; items: AuditRow[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.audit(100, 0).then(setData).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <>
      <PageHeader title="Auditoria" subtitle="Registro de ações no sistema" />

      <div className="filter-toolbar">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={load}>Atualizar</button>
      </div>

      {loading || !data ? (
        <Loading />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{data.total} registro(s)</p>
          <DataTable
            data={data.items}
            columns={[
              { key: 'action', header: 'Ação', render: (r) => <span className="font-medium">{r.action}</span> },
              { key: 'entity', header: 'Entidade', render: (r) => r.entity },
              { key: 'id', header: 'ID', render: (r) => <span className="font-mono text-xs">{truncate(r.entityId, 24)}</span> },
              { key: 'ip', header: 'IP', render: (r) => r.ip ?? '—' },
              { key: 'created', header: 'Data', render: (r) => formatDate(r.createdAt) },
            ]}
          />
        </>
      )}
    </>
  );
}
