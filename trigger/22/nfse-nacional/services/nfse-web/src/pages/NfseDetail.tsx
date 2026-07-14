import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileCode, Ban, Replace } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { api, formatCurrency, formatDate } from '@/lib/api';
import type { Nfse, EventoNfse } from '@/types';

export function NfseDetail() {
  const { chave } = useParams<{ chave: string }>();
  const navigate = useNavigate();
  const [nfse, setNfse] = useState<Nfse | null>(null);
  const [eventos, setEventos] = useState<EventoNfse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [codigoMotivo, setCodigoMotivo] = useState('1');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!chave) return;
    setLoading(true);
    Promise.all([api.getNfse(chave), api.getEventos(chave)])
      .then(([n, e]) => {
        setNfse(n);
        setEventos(e);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [chave]);

  const handleCancelar = async () => {
    const motivoNormalizado = motivo.trim();
    if (motivoNormalizado.length < 15) {
      setError('Motivo deve ter pelo menos 15 caracteres (sem espaços no início ou fim)');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await api.cancelar(chave!, { codigoMotivo, motivo: motivoNormalizado });
      setShowCancel(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !nfse) return <Loading />;

  const canCancel = nfse.situacao === 'AUTORIZADA';
  const canSubstitute = nfse.situacao === 'AUTORIZADA';

  return (
    <>
      <button type="button" onClick={() => navigate('/nfse')} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Voltar para NFS-e do certificado
      </button>

      <PageHeader
        title="Detalhe da NFS-e"
        subtitle={nfse.chaveAcesso}
        subtitleBreakAll
        actions={
          <>
            <a href={api.pdfUrl(nfse.chaveAcesso)} target="_blank" rel="noreferrer" className="btn-secondary">
              <Download size={16} /> PDF
            </a>
            <a href={api.xmlUrl(nfse.chaveAcesso)} target="_blank" rel="noreferrer" className="btn-secondary">
              <FileCode size={16} /> XML
            </a>
            {canCancel && (
              <button type="button" className="btn-danger" onClick={() => setShowCancel(true)}>
                <Ban size={16} /> Cancelar
              </button>
            )}
            {canSubstitute && (
              <Link to={`/emitir?substituir=${chave}`} className="btn-secondary">
                <Replace size={16} /> Substituir
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-4 sm:p-6 xl:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Informações</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Situação</dt>
              <dd className="mt-1"><StatusBadge value={nfse.situacao} /></dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Valor do serviço</dt>
              <dd className="mt-1 text-lg font-semibold">{formatCurrency(nfse.valorServico)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ID DPS</dt>
              <dd className="mt-1 font-mono text-xs break-all">{nfse.idDps}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Emitida em</dt>
              <dd className="mt-1 text-sm">{formatDate(nfse.emitidaEm)}</dd>
            </div>
            {nfse.chaveSubstituida && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Substitui</dt>
                <dd className="mt-1">
                  <Link to={`/nfse/${nfse.chaveSubstituida}`} className="font-mono text-xs text-brand-600 hover:underline">
                    {nfse.chaveSubstituida}
                  </Link>
                </dd>
              </div>
            )}
            {nfse.chaveSubstituta && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Substituída por</dt>
                <dd className="mt-1">
                  <Link to={`/nfse/${nfse.chaveSubstituta}`} className="font-mono text-xs text-brand-600 hover:underline">
                    {nfse.chaveSubstituta}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Eventos</h2>
          {eventos.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum evento registrado</p>
          ) : (
            <ul className="space-y-3">
              {eventos.map((e) => (
                <li key={e.id} className="border-l-2 border-brand-200 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-800">{e.tipo}</span>
                    <StatusBadge value={e.statusRegistro} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(e.createdAt)}</div>
                  {e.motivo && <div className="mt-1 text-xs text-slate-600">{e.motivo}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {nfse.xml && (
        <div className="card mt-6 p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">XML</h2>
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 sm:p-4">
            {nfse.xml.slice(0, 3000)}{nfse.xml.length > 3000 ? '\n…' : ''}
          </pre>
        </div>
      )}

      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold">Cancelar NFS-e</h3>
            <p className="mt-1 text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Código do motivo</label>
                <select className="input" value={codigoMotivo} onChange={(e) => setCodigoMotivo(e.target.value)}>
                  <option value="1">1 — Erro na emissão</option>
                  <option value="2">2 — Serviço não prestado</option>
                  <option value="9">9 — Outros</option>
                </select>
              </div>
              <div>
                <label className="label">Motivo (15–255 caracteres, sem espaço no início/fim)</label>
                <textarea className="input min-h-[80px]" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowCancel(false)}>Voltar</button>
              <button type="button" className="btn-danger" disabled={actionLoading} onClick={handleCancelar}>
                {actionLoading ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
