import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Layers, Inbox, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { api, formatCurrency, formatDate, truncate } from '@/lib/api';
import type { DashboardData, HealthReady, SystemConfig } from '@/types';

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${accent ?? 'bg-brand-50 text-brand-600'}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthReady | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    Promise.all([api.dashboard(), api.healthReady(), api.config()])
      .then(([d, h, c]) => {
        setData(d);
        setHealth(h);
        setConfig(c);
      })
      .catch(console.error);
  }, []);

  if (!data) return <Loading />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral da operação fiscal"
        actions={
          config?.govMock ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle size={16} />
              Modo mock gov.br ativo
            </span>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="NFS-e emitidas" value={data.totais.nfse} icon={FileText} />
        <StatCard label="DPS" value={data.totais.dps} icon={Layers} accent="bg-violet-50 text-violet-600" />
        <StatCard label="DF-e recebidos" value={data.totais.dfe} icon={Inbox} accent="bg-cyan-50 text-cyan-600" />
        <StatCard label="Outbox pendente" value={data.totais.outboxPendente} icon={RefreshCw} accent="bg-orange-50 text-orange-600" />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="card p-5 md:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Saúde do sistema</h2>
          {health ? (
            <dl className="space-y-3 text-sm">
              <div className="dl-row">
                <dt>API</dt>
                <dd><StatusBadge value={health.status} /></dd>
              </div>
              <div className="dl-row">
                <dt>Banco</dt>
                <dd className="text-slate-700 sm:text-right">{health.database ?? '—'}</dd>
              </div>
              {health.certificado && (
                <div className="dl-row">
                  <dt>Certificado</dt>
                  <dd className="text-slate-700 sm:text-right">
                    {health.certificado.mock ? 'Mock' : 'A1'} · {health.certificado.diasParaExpirar} dias
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Indisponível</p>
          )}
        </div>

        <div className="card p-5 md:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">NFS-e por situação</h2>
          <div className="space-y-2">
            {data.nfsePorSituacao.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma nota ainda</p>
            )}
            {data.nfsePorSituacao.map((s) => (
              <div key={s.situacao} className="flex items-center justify-between text-sm">
                <StatusBadge value={s.situacao} />
                <span className="font-medium text-slate-700">{s.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 md:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">DPS por status</h2>
          <div className="space-y-2">
            {data.dpsPorStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <StatusBadge value={s.status} />
                <span className="font-medium text-slate-700">{s.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">NFS-e recentes</h2>
          <div className="card divide-y divide-slate-100">
            {data.nfseRecentes.map((n) => (
              <Link
                key={n.chaveAcesso}
                to={`/nfse/${n.chaveAcesso}`}
                className="flex flex-col gap-2 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-mono text-xs text-slate-500">{truncate(n.chaveAcesso, 28)}</div>
                  <div className="mt-1 text-sm text-slate-700">{formatDate(n.emitidaEm)}</div>
                </div>
                <div className="text-left sm:text-right">
                  <StatusBadge value={n.situacao} />
                  <div className="mt-1 text-sm font-medium">{formatCurrency(n.valorServico)}</div>
                </div>
              </Link>
            ))}
            {data.nfseRecentes.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma NFS-e emitida</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Atividade recente</h2>
          <div className="card divide-y divide-slate-100">
            {data.ultimosEventos.map((e) => (
              <div key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{e.action}</span>
                  <span className="text-xs text-slate-400">{formatDate(e.createdAt)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {e.entity} · {truncate(e.entityId, 24)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
