import { ShieldCheck, ShieldAlert, Building2, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatCnpj, formatDate } from '@/lib/api';
import type { NfseListagem } from '@/types';

interface Props {
  resumo: NfseListagem['resumo'];
}

export function CertificadoNfsePanel({ resumo }: Props) {
  const { emitente, certificado } = resumo;
  const certOk = !certificado.mock && certificado.diasParaExpirar !== undefined && certificado.diasParaExpirar >= 30;
  const certWarning = !certificado.mock && certificado.diasParaExpirar !== undefined && certificado.diasParaExpirar < 30;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-brand-950 to-brand-800 px-4 py-4 text-white sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white/10 p-2.5">
              <Building2 size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-100">Prestador vinculado ao certificado</p>
              <h2 className="mt-1 text-lg font-semibold leading-tight">{emitente.razaoSocial}</h2>
              <p className="mt-1 font-mono text-sm text-brand-100">{formatCnpj(emitente.cnpj)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={emitente.ambiente.toUpperCase()} />
            {certificado.mock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-100 ring-1 ring-inset ring-amber-400/30">
                <ShieldAlert size={12} />
                Certificado mock
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  certOk
                    ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/30'
                    : certWarning
                      ? 'bg-red-500/20 text-red-100 ring-red-400/30'
                      : 'bg-white/10 text-brand-100 ring-white/20'
                }`}
              >
                {certOk ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                A1 · {certificado.diasParaExpirar} dias
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Município emissor</p>
          <p className="mt-1 flex items-start gap-1.5 text-sm font-medium text-slate-800">
            <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <span>
              {emitente.nomeMunicipio
                ? `${emitente.nomeMunicipio} (IBGE ${emitente.codigoMunicipio})`
                : `IBGE ${emitente.codigoMunicipio}`}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Inscrição municipal</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{emitente.inscricaoMunicipal || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">CNPJ do certificado</p>
          <p className="mt-1 font-mono text-sm text-slate-800">
            {certificado.cnpj ? formatCnpj(certificado.cnpj) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Validade do certificado</p>
          <p className={`mt-1 text-sm font-medium ${certWarning ? 'text-red-600' : 'text-slate-800'}`}>
            {certificado.validade ? formatDate(certificado.validade) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
