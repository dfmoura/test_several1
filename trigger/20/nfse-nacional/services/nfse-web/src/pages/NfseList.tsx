import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Replace,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode,
  ExternalLink,
  Inbox,
  Building2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { Loading } from '@/components/Loading';
import { StatusBadge } from '@/components/StatusBadge';
import { CertificadoNfsePanel } from '@/components/CertificadoNfsePanel';
import { api, formatChaveAcesso, formatCnpj, formatCurrency, formatDate } from '@/lib/api';
import type { Nfse, NfseListagem, NfseRecebida, NfseRecebidasListagem } from '@/types';

type TabId = 'emitidas' | 'recebidas';

const SITUACOES = ['', 'AUTORIZADA', 'CANCELADA', 'SUBSTITUIDA', 'ANALISE_FISCAL'] as const;
const PAGE_SIZE = 25;

const SITUACAO_LABELS: Record<string, string> = {
  AUTORIZADA: 'Autorizada',
  CANCELADA: 'Cancelada',
  SUBSTITUIDA: 'Substituída',
  ANALISE_FISCAL: 'Análise fiscal',
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`shrink-0 rounded-lg p-2.5 ${accent ?? 'bg-brand-50 text-brand-600'}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700'
      }`}
    >
      <Icon size={16} />
      {label}
      {count !== undefined && (
        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  loading,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <button type="button" className="btn-secondary px-2 py-1.5" disabled={page === 0 || loading} onClick={onPrev}>
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[5rem] text-center tabular-nums">
        {page + 1} / {totalPages}
      </span>
      <button type="button" className="btn-secondary px-2 py-1.5" disabled={page >= totalPages - 1 || loading} onClick={onNext}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function NfseList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('aba') === 'recebidas' ? 'recebidas' : 'emitidas') as TabId;

  const [panelResumo, setPanelResumo] = useState<NfseListagem['resumo'] | null>(null);
  const [data, setData] = useState<NfseListagem | null>(null);
  const [recebidas, setRecebidas] = useState<NfseRecebidasListagem | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ processados: number; ultimoNsu: string } | null>(null);
  const [situacao, setSituacao] = useState('');
  const [chave, setChave] = useState('');
  const [chaveInput, setChaveInput] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [page, setPage] = useState(0);
  const [recebidasPreview, setRecebidasPreview] = useState<NfseRecebidasListagem | null>(null);

  const setTab = (next: TabId) => {
    setSearchParams(next === 'recebidas' ? { aba: 'recebidas' } : {});
    setPage(0);
  };

  useEffect(() => {
    api.listNfse({ limit: 1 }).then((r) => setPanelResumo(r.resumo));
    api.listNfseRecebidas({ limit: 1 }).then(setRecebidasPreview);
  }, []);

  const recebidasCount =
    tab === 'recebidas' ? recebidas?.resumo.totalGeral : recebidasPreview?.resumo.totalGeral;

  const loadEmitidas = useCallback(() => {
    setLoading(true);
    api
      .listNfse({
        situacao: situacao || undefined,
        chave: chave || undefined,
        de: de || undefined,
        ate: ate || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      .then((r) => {
        setData(r);
        setPanelResumo(r.resumo);
      })
      .finally(() => setLoading(false));
  }, [situacao, chave, de, ate, page]);

  const loadRecebidas = useCallback(() => {
    setLoading(true);
    api
      .listNfseRecebidas({
        chave: chave || undefined,
        de: de || undefined,
        ate: ate || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      .then((r) => {
        setRecebidas(r);
        setRecebidasPreview(r);
      })
      .finally(() => setLoading(false));
  }, [chave, de, ate, page]);

  useEffect(() => {
    if (tab === 'emitidas') loadEmitidas();
    else loadRecebidas();
  }, [tab, loadEmitidas, loadRecebidas]);

  const refresh = () => (tab === 'emitidas' ? loadEmitidas() : loadRecebidas());

  const handleSyncAdn = async () => {
    setSyncing(true);
    try {
      const result = await api.syncDfe();
      setLastSync(result);
      loadRecebidas();
      api.listNfse({ limit: 1 }).then((r) => setPanelResumo(r.resumo));
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setChave(chaveInput.replace(/\D/g, ''));
    setPage(0);
  };

  const clearFilters = () => {
    setSituacao('');
    setChave('');
    setChaveInput('');
    setDe('');
    setAte('');
    setPage(0);
  };

  const hasFilters = Boolean((tab === 'emitidas' && situacao) || chave || de || ate);
  const activeTotal = tab === 'emitidas' ? data?.total ?? 0 : recebidas?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(activeTotal / PAGE_SIZE));
  const resumo = data?.resumo ?? panelResumo;

  const countBySituacao = (s: string) =>
    resumo?.porSituacao.find((x) => x.situacao === s)?.total ?? 0;

  return (
    <>
      <PageHeader
        title="NFS-e do certificado"
        subtitle={
          tab === 'emitidas'
            ? 'Notas emitidas por você com o certificado digital A1'
            : 'Notas de outros prestadores em que seu CNPJ é tomador (distribuição ADN)'
        }
        actions={
          <>
            {tab === 'recebidas' && (
              <button type="button" className="btn-primary" onClick={handleSyncAdn} disabled={syncing}>
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando ADN…' : 'Sincronizar ADN'}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            {tab === 'emitidas' && (
              <Link to="/emitir" className="btn-primary">
                <Plus size={16} />
                Nova emissão
              </Link>
            )}
          </>
        }
      />

      <div className="mb-6 border-b border-slate-200">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          <TabButton
            active={tab === 'emitidas'}
            onClick={() => setTab('emitidas')}
            icon={FileText}
            label="Emitidas por mim"
            count={resumo?.totalGeral}
          />
          <TabButton
            active={tab === 'recebidas'}
            onClick={() => setTab('recebidas')}
            icon={Inbox}
            label="Recebidas de terceiros"
            count={recebidasCount}
          />
        </div>
      </div>

      {tab === 'emitidas' && recebidasCount !== undefined && recebidasCount > 0 && (
        <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          Existem <strong>{recebidasCount}</strong> NFS-e de <strong>outros prestadores</strong> contra o CNPJ do seu
          certificado (você é tomador). Elas não aparecem nesta aba — veja em{' '}
          <button type="button" className="font-semibold text-cyan-800 underline" onClick={() => setTab('recebidas')}>
            Recebidas de terceiros
          </button>
          .
        </div>
      )}

      {resumo && <CertificadoNfsePanel resumo={resumo} />}

      {tab === 'emitidas' && resumo && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total emitidas" value={resumo.totalGeral} sub="Por este certificado" icon={FileText} />
          <StatCard label="Autorizadas" value={countBySituacao('AUTORIZADA')} icon={CheckCircle2} accent="bg-emerald-50 text-emerald-600" />
          <StatCard label="Canceladas" value={countBySituacao('CANCELADA')} icon={XCircle} accent="bg-red-50 text-red-600" />
          <StatCard label="Substituídas" value={countBySituacao('SUBSTITUIDA')} icon={Replace} accent="bg-amber-50 text-amber-600" />
          <StatCard label="Valor total" value={formatCurrency(resumo.valorTotalGeral)} icon={Banknote} accent="bg-violet-50 text-violet-600" />
        </div>
      )}

      {tab === 'recebidas' && recebidas && (
        <>
          <div className="mt-6 rounded-lg border border-cyan-200 bg-cyan-50/60 px-4 py-3 text-sm text-cyan-900">
            <strong>Distribuição ADN:</strong> NFS-e emitidas por <em>outros prestadores</em> contra o CNPJ{' '}
            <span className="font-mono">{formatCnpj(recebidas.resumo.cnpjTomador)}</span> do certificado, conforme{' '}
            <code className="text-xs">GET /contribuintes/DFe/&#123;NSU&#125;</code> na documentação oficial.
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Recebidas de terceiros" value={recebidas.resumo.totalGeral} sub="Tomador = seu CNPJ" icon={Inbox} accent="bg-cyan-50 text-cyan-600" />
            <StatCard label="Valor total" value={formatCurrency(recebidas.resumo.valorTotalGeral)} icon={Banknote} accent="bg-violet-50 text-violet-600" />
            <StatCard label="Último NSU ADN" value={recebidas.resumo.ultimoNsu ?? '0'} sub="Ambiente de Dados Nacional" icon={Building2} accent="bg-slate-100 text-slate-600" />
          </div>
          {lastSync && (
            <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Sincronização ADN: {lastSync.processados} documento(s). NSU atual: {lastSync.ultimoNsu}
            </div>
          )}
        </>
      )}

      <div className="card mt-6 p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Filtros</h2>
        <form onSubmit={handleSearch} className="filter-toolbar">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Chave de acesso (50 dígitos)"
              value={chaveInput}
              onChange={(e) => setChaveInput(e.target.value)}
              maxLength={62}
              inputMode="numeric"
            />
          </div>
          {tab === 'emitidas' && (
            <select
              className="input w-full sm:max-w-[11rem]"
              value={situacao}
              onChange={(e) => {
                setSituacao(e.target.value);
                setPage(0);
              }}
            >
              {SITUACOES.map((s) => (
                <option key={s} value={s}>
                  {s ? (SITUACAO_LABELS[s] ?? s.replace(/_/g, ' ')) : 'Todas as situações'}
                </option>
              ))}
            </select>
          )}
          <input type="date" className="input w-full sm:max-w-[10rem]" value={de} onChange={(e) => { setDe(e.target.value); setPage(0); }} />
          <input type="date" className="input w-full sm:max-w-[10rem]" value={ate} onChange={(e) => { setAte(e.target.value); setPage(0); }} />
          <button type="submit" className="btn-primary w-full sm:w-auto">
            <Search size={16} />
            Buscar
          </button>
          {hasFilters && (
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </form>
      </div>

      <div className="mb-3 mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{activeTotal}</span>
          {hasFilters ? ' nota(s) encontrada(s)' : ' nota(s)'}
        </p>
        <Pagination page={page} totalPages={totalPages} loading={loading} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
      </div>

      {loading && (tab === 'emitidas' ? !data : !recebidas) ? (
        <Loading />
      ) : tab === 'emitidas' ? (
        <DataTable
          data={data?.items ?? []}
          onRowClick={(row) => navigate(`/nfse/${row.chaveAcesso}`)}
          emptyMessage={
            hasFilters
              ? 'Nenhuma NFS-e encontrada com os filtros aplicados.'
              : 'Nenhuma NFS-e emitida ainda. Utilize "Nova emissão" para gerar a primeira nota.'
          }
          columns={[
            {
              key: 'chave',
              header: 'Chave de acesso',
              className: 'min-w-[14rem]',
              render: (r: Nfse) => (
                <span className="font-mono text-xs leading-relaxed text-slate-600" title={r.chaveAcesso}>
                  {formatChaveAcesso(r.chaveAcesso)}
                </span>
              ),
            },
            { key: 'situacao', header: 'Situação', render: (r: Nfse) => <StatusBadge value={r.situacao} /> },
            { key: 'valor', header: 'Valor', className: 'whitespace-nowrap', render: (r: Nfse) => <span className="font-medium">{formatCurrency(r.valorServico)}</span> },
            { key: 'emitida', header: 'Emissão', className: 'whitespace-nowrap', render: (r: Nfse) => formatDate(r.emitidaEm) },
            {
              key: 'acoes',
              header: '',
              className: 'w-24',
              render: (r: Nfse) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <a href={api.pdfUrl(r.chaveAcesso)} target="_blank" rel="noreferrer" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="PDF">
                    <Download size={15} />
                  </a>
                  <a href={api.xmlUrl(r.chaveAcesso)} target="_blank" rel="noreferrer" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="XML">
                    <FileCode size={15} />
                  </a>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <DataTable
          data={recebidas?.items ?? []}
          emptyMessage={
            hasFilters
              ? 'Nenhuma NFS-e recebida encontrada com os filtros aplicados.'
              : 'Nenhuma NFS-e de terceiros sincronizada. Clique em "Sincronizar ADN" para buscar no Ambiente de Dados Nacional.'
          }
          columns={[
            {
              key: 'prestador',
              header: 'Prestador',
              render: (r: NfseRecebida) => (
                <div>
                  <div className="font-medium text-slate-800">{r.prestadorRazaoSocial}</div>
                  <div className="font-mono text-xs text-slate-500">{formatCnpj(r.prestadorCnpj)}</div>
                </div>
              ),
            },
            {
              key: 'chave',
              header: 'Chave de acesso',
              className: 'min-w-[12rem]',
              render: (r: NfseRecebida) => (
                <span className="font-mono text-xs text-slate-600" title={r.chave}>
                  {formatChaveAcesso(r.chave)}
                </span>
              ),
            },
            { key: 'valor', header: 'Valor', className: 'whitespace-nowrap', render: (r: NfseRecebida) => formatCurrency(r.valorServico) },
            { key: 'emitida', header: 'Emissão', className: 'whitespace-nowrap', render: (r: NfseRecebida) => (r.emitidaEm ? formatDate(r.emitidaEm) : '—') },
            { key: 'recebido', header: 'Recebido ADN', className: 'whitespace-nowrap', render: (r: NfseRecebida) => formatDate(r.recebidoEm) },
            {
              key: 'acoes',
              header: '',
              className: 'w-16',
              render: (r: NfseRecebida) => (
                <a
                  href={api.xmlRecebidaUrl(r.chave)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="XML recebido"
                >
                  <FileCode size={15} />
                </a>
              ),
            },
          ]}
        />
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        {tab === 'emitidas' ? (
          <>
            NFS-e emitidas localmente com o certificado (mTLS + assinatura XML). Consulta individual na SEFIN em cada detalhe.
          </>
        ) : (
          <>
            NFS-e distribuídas pelo ADN Nacional para o CNPJ do certificado quando você é tomador do serviço. Não há listagem em massa na SEFIN — apenas distribuição por NSU (
            <a href="https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
              documentação técnica
              <ExternalLink size={10} className="ml-0.5 inline" />
            </a>
            ).
          </>
        )}
      </p>
    </>
  );
}
