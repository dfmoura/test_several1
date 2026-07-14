import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { api, formatDate, truncate } from '@/lib/api';

interface DpsRow {
  idDps: string;
  status: string;
  numeroDps: string;
  serie: string;
  correlationId?: string;
  createdAt: string;
}

const STATUSES = ['', 'RASCUNHO', 'ENVIANDO', 'AUTORIZADA', 'REJEITADA', 'CANCELADA', 'SUBSTITUIDA'];

export function DpsList() {
  const [data, setData] = useState<{ total: number; items: DpsRow[] } | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.dps(100, 0, status || undefined).then(setData).finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  return (
    <>
      <PageHeader title="DPS" subtitle="Declarações de prestação de serviço" />

      <div className="filter-toolbar">
        <select className="input w-full sm:max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'Todos os status'}</option>
          ))}
        </select>
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
              { key: 'id', header: 'ID DPS', render: (r) => <span className="font-mono text-xs">{truncate(r.idDps, 28)}</span> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
              { key: 'numero', header: 'Número', render: (r) => r.numeroDps },
              { key: 'serie', header: 'Série', render: (r) => r.serie },
              { key: 'created', header: 'Criado em', render: (r) => formatDate(r.createdAt) },
            ]}
          />
        </>
      )}
    </>
  );
}
