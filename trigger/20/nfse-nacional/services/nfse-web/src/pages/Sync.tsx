import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { api, formatDate, truncate } from '@/lib/api';

interface DfeRow {
  nsu: string;
  tipoDfe: string;
  chave: string;
  processado: boolean;
  recebidoEm: string;
}

export function Sync() {
  const [nsu, setNsu] = useState<{ ultimoNsu: string; dfePendente: number; syncIntervalSec: number } | null>(null);
  const [dfe, setDfe] = useState<{ total: number; items: DfeRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ processados: number; ultimoNsu: string } | null>(null);
  const [filtro, setFiltro] = useState<string>('');

  const load = () => {
    setLoading(true);
    const processado = filtro === '' ? undefined : filtro === 'true';
    Promise.all([api.nsu(), api.dfe(50, 0, processado)])
      .then(([n, d]) => {
        setNsu(n);
        setDfe(d);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [filtro]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.syncDfe();
      setLastSync(result);
      load();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Sincronização ADN"
        subtitle="Documentos fiscais eletrônicos recebidos"
        actions={
          <button type="button" className="btn-primary" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Forçar sincronização'}
          </button>
        }
      />

      {nsu && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-sm text-slate-500">Último NSU</p>
            <p className="mt-1 font-mono text-lg font-semibold">{nsu.ultimoNsu}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">DF-e pendentes</p>
            <p className="mt-1 text-lg font-semibold text-orange-600">{nsu.dfePendente}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">Intervalo de sync</p>
            <p className="mt-1 text-lg font-semibold">{nsu.syncIntervalSec}s</p>
          </div>
        </div>
      )}

      {lastSync && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Última sincronização: {lastSync.processados} documento(s) processado(s). NSU: {lastSync.ultimoNsu}
        </div>
      )}

      <div className="filter-toolbar">
        <select className="input w-full sm:max-w-xs" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="false">Pendentes</option>
          <option value="true">Processados</option>
        </select>
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={load}>Atualizar</button>
      </div>

      {loading || !dfe ? (
        <Loading />
      ) : (
        <DataTable
          data={dfe.items}
          columns={[
            { key: 'nsu', header: 'NSU', render: (r) => <span className="font-mono text-xs">{r.nsu}</span> },
            { key: 'tipo', header: 'Tipo', render: (r) => r.tipoDfe },
            { key: 'chave', header: 'Chave', render: (r) => <span className="font-mono text-xs">{truncate(r.chave, 24)}</span> },
            { key: 'proc', header: 'Status', render: (r) => <StatusBadge value={r.processado ? 'REGISTRADO' : 'RASCUNHO'} /> },
            { key: 'recebido', header: 'Recebido em', render: (r) => formatDate(r.recebidoEm) },
          ]}
        />
      )}
    </>
  );
}
