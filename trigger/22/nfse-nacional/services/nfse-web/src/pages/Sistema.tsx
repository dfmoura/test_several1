import { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { api, formatCnpj, formatDate } from '@/lib/api';
import type { HealthReady, SystemConfig } from '@/types';

const infraLinks = [
  { label: 'RabbitMQ', url: 'http://localhost:18672', desc: 'Filas e mensagens' },
  { label: 'MinIO Console', url: 'http://localhost:19001', desc: 'Armazenamento de XMLs' },
  { label: 'Traefik', url: 'http://localhost:18181', desc: 'Dashboard do proxy' },
  { label: 'API REST', url: 'http://localhost:18100/health/ready', desc: 'Health check direto' },
];

export function Sistema() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [health, setHealth] = useState<HealthReady | null>(null);

  useEffect(() => {
    Promise.all([api.config(), api.healthReady()]).then(([c, h]) => {
      setConfig(c);
      setHealth(h);
    });
  }, []);

  if (!config) return <Loading />;

  return (
    <>
      <PageHeader title="Sistema" subtitle="Configuração e infraestrutura" />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Prestador</h2>
          <dl className="space-y-3 text-sm">
            <div className="dl-row">
              <dt>Razão social</dt>
              <dd className="font-medium sm:text-right">{config.razaoSocial}</dd>
            </div>
            <div className="dl-row">
              <dt>CNPJ</dt>
              <dd className="font-mono sm:text-right">{formatCnpj(config.cnpj)}</dd>
            </div>
            <div className="dl-row">
              <dt>Município (IBGE)</dt>
              <dd className="sm:text-right">
                {config.nomeMunicipio
                  ? `${config.nomeMunicipio} (${config.codigoMunicipio})`
                  : config.codigoMunicipio}
              </dd>
            </div>
            <div className="dl-row">
              <dt>Inscrição municipal</dt>
              <dd className="sm:text-right">
                {config.inscricaoMunicipal || '—'}
                <p className="mt-0.5 text-xs font-normal text-slate-400 sm:text-right">
                  Cadastro manual (.env) — não vem do certificado nem do cartão CNPJ
                </p>
              </dd>
            </div>
            {config.email && (
              <div className="dl-row">
                <dt>E-mail</dt>
                <dd className="break-all sm:text-right">{config.email}</dd>
              </div>
            )}
            {config.telefone && (
              <div className="dl-row">
                <dt>Telefone</dt>
                <dd className="sm:text-right">{config.telefone}</dd>
              </div>
            )}
            <div className="dl-row">
              <dt>Série DPS</dt>
              <dd className="sm:text-right">{config.dpsSerie}</dd>
            </div>
            <div className="dl-row">
              <dt>Ambiente</dt>
              <dd className="sm:text-right"><StatusBadge value={config.ambiente.toUpperCase()} /></dd>
            </div>
            <div className="dl-row">
              <dt>Gov.br mock</dt>
              <dd className="sm:text-right">{config.govMock ? 'Sim' : 'Não'}</dd>
            </div>
            <div className="dl-row">
              <dt>Certificado A1</dt>
              <dd className="sm:text-right">
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span>{config.certificadoAtivo ? 'Ativo (dados do emitente)' : 'Mock / indisponível'}</span>
                  <Link
                    to="/nfse"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                  >
                    <FileText size={12} />
                    Ver NFS-e emitidas
                  </Link>
                </div>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Saúde</h2>
          {health ? (
            <dl className="space-y-3 text-sm">
              <div className="dl-row">
                <dt>Status</dt>
                <dd className="sm:text-right"><StatusBadge value={health.status} /></dd>
              </div>
              <div className="dl-row">
                <dt>Banco de dados</dt>
                <dd className="sm:text-right">{health.database ?? '—'}</dd>
              </div>
              {health.certificado && (
                <>
                  <div className="dl-row">
                    <dt>Certificado</dt>
                    <dd className="sm:text-right">{health.certificado.mock ? 'Mock (dev)' : 'A1 real'}</dd>
                  </div>
                  {!health.certificado.mock && health.certificado.cnpj && (
                    <div className="dl-row">
                      <dt>CNPJ emitente (cert.)</dt>
                      <dd className="font-mono sm:text-right">{formatCnpj(health.certificado.cnpj)}</dd>
                    </div>
                  )}
                  <div className="dl-row">
                    <dt>Certificado válido até</dt>
                    <dd className="sm:text-right">{formatDate(health.certificado.validade)}</dd>
                  </div>
                  <div className="dl-row">
                    <dt>Dias para expirar</dt>
                    <dd className={`sm:text-right ${health.certificado.diasParaExpirar < 30 ? 'font-medium text-red-600' : ''}`}>
                      {health.certificado.diasParaExpirar}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Indisponível</p>
          )}
        </div>
      </div>

      <div className="card mt-6 p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Ferramentas de infraestrutura</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {infraLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800">{link.label}</div>
                <div className="text-xs text-slate-500">{link.desc}</div>
              </div>
              <ExternalLink size={16} className="shrink-0 text-slate-400" />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
