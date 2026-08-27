import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Building2, Inbox, AlertTriangle } from 'lucide-react';
import { PageHeader, Loading, StatusBadge } from '@/components/ui';
import { api, formatCurrency, formatDate, truncate } from '@/lib/api';
import type { DashboardData, SystemConfig } from '@/types';

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    Promise.all([api.dashboard(), api.config()]).then(([d, c]) => {
      setData(d);
      setConfig(c);
    }).catch(console.error);
  }, []);

  if (!data) return <Loading />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Operação fiscal NF-e modelo 55 · SEFAZ-MG"
        actions={config?.sefazMock ? (
          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle size={16} /> Modo mock SEFAZ
          </span>
        ) : undefined}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">NF-e emitidas</p>
          <p className="mt-1 text-2xl font-semibold">{data.totais.nfe}</p>
          <FileText className="mt-2 text-brand-600" size={20} />
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Emitentes</p>
          <p className="mt-1 text-2xl font-semibold">{data.totais.emitentes}</p>
          <Building2 className="mt-2 text-cyan-700" size={20} />
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Lotes processando</p>
          <p className="mt-1 text-2xl font-semibold">{data.totais.lotesProcessando}</p>
          <Inbox className="mt-2 text-orange-600" size={20} />
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Outbox pendente</p>
          <p className="mt-1 text-2xl font-semibold">{data.totais.outboxPendente}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">NF-e por situação</h2>
          {data.nfePorSituacao.length === 0 && <p className="text-sm text-slate-500">Nenhuma nota ainda</p>}
          {data.nfePorSituacao.map((s) => (
            <div key={s.situacao} className="mb-2 flex items-center justify-between text-sm">
              <StatusBadge value={s.situacao} />
              <span className="font-medium">{s.total}</span>
            </div>
          ))}
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Certificados A1</h2>
          {data.certificados.map((c) => (
            <div key={c.emitenteId} className="mb-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{c.apelido}</div>
                <div className="text-xs text-slate-500">{c.cnpj}</div>
              </div>
              <StatusBadge value={c.presente ? (c.diasParaExpirar !== null && c.diasParaExpirar <= 30 ? 'aviso' : 'ok') : 'ausente'} />
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold">Notas recentes</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Número</th>
              <th className="px-4 py-2">Situação</th>
              <th className="px-4 py-2">Valor</th>
              <th className="px-4 py-2">Emissão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.nfeRecentes.map((n) => (
              <tr key={n.chaveAcesso} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/nfe/${n.chaveAcesso}`} className="font-medium text-brand-700">
                    {n.serie}/{n.numero}
                  </Link>
                  <div className="font-mono text-xs text-slate-400">{truncate(n.chaveAcesso, 28)}</div>
                </td>
                <td className="px-4 py-2"><StatusBadge value={n.situacao} /></td>
                <td className="px-4 py-2">{formatCurrency(n.valorNf)}</td>
                <td className="px-4 py-2 text-slate-500">{formatDate(n.dhEmi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
