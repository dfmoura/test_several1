import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconBan, IconCloudDownload, IconDownload, IconLink } from '../components/NavIcons';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import {
  api,
  ApiError,
  type DfeDocumento,
  type DfeFornecedorStatus,
  type DfeSyncEstado,
  type OrdemCompra,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  emissao: (d: DfeDocumento) => d.data_emissao,
  emitente: (d: DfeDocumento) => d.emit_nome,
  numero: (d: DfeDocumento) => d.numero,
  valor: (d: DfeDocumento) => Number(d.valor_total ?? 0),
  situacao: (d: DfeDocumento) => d.situacao,
  fornecedor: (d: DfeDocumento) => d.fornecedor?.status ?? '',
};

type FornecedorPreviewRow = {
  line: number;
  status: 'ok' | 'info' | 'erro' | string;
  acao?: 'criar' | 'adicionar_papel' | 'nenhuma' | null;
  errors: string[];
  warnings?: string[];
  data: Record<string, unknown>;
  parceiro_id?: number;
  preview: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj_cpf?: string | null;
    municipio?: string | null;
    uf?: string | null;
    ie?: string | null;
    cnpj_status?: string | null;
    parceiro_codigo?: string | null;
    dest_aviso?: string | null;
    enrichment?: {
      status?: string;
      filled?: string[];
      message?: string | null;
    };
  };
};

function formatCnpj(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—';
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function fornecedorPillLabel(status: DfeFornecedorStatus | undefined): string {
  switch (status) {
    case 'cadastrado':
      return 'Cadastrado';
    case 'sem_papel':
      return 'Sem papel';
    case 'nao_cadastrado':
      return 'Não cadastrado';
    case 'pf':
      return 'PF';
    case 'sem_cnpj':
      return 'Sem CNPJ';
    default:
      return status ?? '—';
  }
}

function fornecedorTitle(doc: DfeDocumento, podeParceiro: boolean): string {
  const f = doc.fornecedor;
  if (!f) return '';
  if (f.status === 'cadastrado') {
    return f.codigo ? `Fornecedor ${f.codigo}` : 'Fornecedor cadastrado';
  }
  if (f.status === 'pf' || f.status === 'sem_cnpj') {
    return 'Cadastro via XML de NF-e aplica-se a emitente PJ com CNPJ.';
  }
  if (!doc.tem_xml) {
    return 'Busque o XML no fisco antes de cadastrar o fornecedor.';
  }
  if (!podeParceiro) {
    return 'Sem permissão para cadastrar parceiro.';
  }
  if (f.status === 'sem_papel') {
    return 'Parceiro existe sem classificação fornecedor — clique para adicionar o papel via XML.';
  }
  return 'Clique para simular o cadastro do fornecedor a partir do XML da nota.';
}

export function ComprasNfeDestinadasPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const anoAtual = new Date().getFullYear();
  const [docs, setDocs] = useState<DfeDocumento[]>([]);
  const [sync, setSync] = useState<DfeSyncEstado | null>(null);
  const [q, setQ] = useState('');
  const [situacao, setSituacao] = useState('');
  const [ano, setAno] = useState(String(anoAtual));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncErro, setSyncErro] = useState<string | null>(null);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [amarrarDoc, setAmarrarDoc] = useState<DfeDocumento | null>(null);
  const [ocs, setOcs] = useState<OrdemCompra[]>([]);
  const [ocId, setOcId] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [fornecedorDoc, setFornecedorDoc] = useState<DfeDocumento | null>(null);
  const [fornecedorPreview, setFornecedorPreview] = useState<FornecedorPreviewRow | null>(null);
  const [fornecedorBusy, setFornecedorBusy] = useState(false);
  const pollRef = useRef<number | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(docs, SORT);
  const podeEscrever = hasPermission('compras.escrever');
  const podeParceiro = hasPermission('parceiro.escrever');

  const load = useCallback(async (search?: string, st?: string, year?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (st) params.set('situacao', st);
      if (year) params.set('ano', year);
      const qs = params.toString();
      const res = await api.get<{
        data: DfeDocumento[];
        meta: { situacoes: string[]; ano: number; sync: DfeSyncEstado };
      }>(`/dfe-documentos${qs ? `?${qs}` : ''}`);
      setDocs(res.data);
      setSync(res.meta.sync);
    } finally {
      setLoading(false);
    }
  }, []);

  const stopPoll = () => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    void load(undefined, undefined, String(anoAtual));
    return () => stopPoll();
  }, [anoAtual, load]);

  useEffect(() => {
    if (sync?.sync_status !== 'RUNNING') {
      stopPoll();
      setSyncing(false);
      return;
    }
    if (pollRef.current != null) return;
    pollRef.current = window.setInterval(() => {
      void load(q, situacao, ano);
    }, 2500);
    return () => stopPoll();
  }, [sync?.sync_status, load, q, situacao, ano]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q, situacao, ano);
  };

  const handleAtualizar = async () => {
    setSyncErro(null);
    setSyncing(true);
    try {
      const res = await api.post<{ data: DfeSyncEstado }>('/dfe-sync', {});
      setSync(res.data);
      void load(q, situacao, ano);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSyncErro(err.details?.sync?.[0] ?? err.message);
      } else {
        setSyncErro(err instanceof Error ? err.message : 'Não foi possível enfileirar o sync.');
      }
      setSyncing(false);
    }
  };

  const abrirAmarrar = async (doc: DfeDocumento) => {
    setAcaoErro(null);
    setFornecedorDoc(null);
    setFornecedorPreview(null);
    setAmarrarDoc(doc);
    setOcId('');
    const [abertas, parciais] = await Promise.all([
      api.get<{ data: OrdemCompra[] }>('/ordens-compra?status=ABERTA'),
      api.get<{ data: OrdemCompra[] }>('/ordens-compra?status=PARCIAL'),
    ]);
    const map = new Map<number, OrdemCompra>();
    for (const o of [...abertas.data, ...parciais.data]) map.set(o.id, o);
    setOcs([...map.values()]);
  };

  const confirmarAmarrar = async () => {
    if (!amarrarDoc || !ocId) return;
    setBusyId(amarrarDoc.id);
    setAcaoErro(null);
    try {
      await api.post(`/dfe-documentos/${amarrarDoc.id}/amarrar`, {
        ordem_compra_id: Number(ocId),
      });
      setAmarrarDoc(null);
      navigate(`/compras/ordens/${ocId}?dfe=${amarrarDoc.id}`);
    } catch (err) {
      setAcaoErro(err instanceof ApiError ? err.details?.dfe?.[0] ?? err.message : 'Falha ao amarrar.');
    } finally {
      setBusyId(null);
    }
  };

  const buscarXml = async (doc: DfeDocumento) => {
    setBusyId(doc.id);
    setAcaoErro(null);
    try {
      await api.post(`/dfe-documentos/${doc.id}/buscar-xml`, {});
      void load(q, situacao, ano);
    } catch (err) {
      setAcaoErro(err instanceof ApiError ? err.details?.dfe?.[0] ?? err.message : 'Falha ao buscar XML.');
    } finally {
      setBusyId(null);
    }
  };

  const baixarXml = async (doc: DfeDocumento) => {
    if (!doc.tem_xml) return;
    setBusyId(doc.id);
    setAcaoErro(null);
    try {
      const nome =
        doc.chave && doc.chave.replace(/\D/g, '').length === 44
          ? `NFe-${doc.chave.replace(/\D/g, '')}.xml`
          : `NFe-dfe-${doc.id}.xml`;
      await api.download(`/dfe-documentos/${doc.id}/xml`, nome);
    } catch (err) {
      setAcaoErro(
        err instanceof ApiError
          ? err.details?.xml?.[0] ?? err.message
          : 'Falha ao baixar XML.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const semInteresse = async (doc: DfeDocumento) => {
    setBusyId(doc.id);
    setAcaoErro(null);
    try {
      await api.post(`/dfe-documentos/${doc.id}/sem-interesse`, {});
      void load(q, situacao, ano);
    } catch (err) {
      setAcaoErro(err instanceof ApiError ? err.details?.dfe?.[0] ?? err.message : 'Falha ao marcar.');
    } finally {
      setBusyId(null);
    }
  };

  const fecharFornecedor = () => {
    setFornecedorDoc(null);
    setFornecedorPreview(null);
    setFornecedorBusy(false);
  };

  const abrirFornecedor = async (doc: DfeDocumento) => {
    const f = doc.fornecedor;
    if (!f) return;

    if (f.status === 'cadastrado' && f.parceiro_id) {
      navigate(`/parceiros/${f.parceiro_id}`);
      return;
    }

    if (!podeParceiro) return;
    if (f.status === 'pf' || f.status === 'sem_cnpj') return;

    if (!doc.tem_xml) {
      setAcaoErro('Busque o XML no fisco antes de cadastrar o fornecedor.');
      return;
    }

    if (f.status !== 'nao_cadastrado' && f.status !== 'sem_papel') return;

    setAmarrarDoc(null);
    setAcaoErro(null);
    setFornecedorDoc(doc);
    setFornecedorPreview(null);
    setFornecedorBusy(true);
    try {
      const res = await api.post<{
        data: { row: FornecedorPreviewRow; documento: DfeDocumento };
      }>(`/dfe-documentos/${doc.id}/fornecedor/preview`, {});
      setFornecedorPreview(res.data.row);
      if (res.data.documento) {
        setFornecedorDoc(res.data.documento);
      }
    } catch (err) {
      setFornecedorDoc(null);
      setAcaoErro(
        err instanceof ApiError
          ? err.details?.fornecedor?.[0] ?? err.message
          : 'Falha ao simular o cadastro do fornecedor.',
      );
    } finally {
      setFornecedorBusy(false);
    }
  };

  const confirmarFornecedor = async () => {
    if (!fornecedorDoc || !fornecedorPreview) return;
    const acao = fornecedorPreview.acao;
    if (acao !== 'criar' && acao !== 'adicionar_papel') return;

    setFornecedorBusy(true);
    setAcaoErro(null);
    try {
      await api.post(`/dfe-documentos/${fornecedorDoc.id}/fornecedor/commit`, {});
      fecharFornecedor();
      void load(q, situacao, ano);
    } catch (err) {
      setAcaoErro(
        err instanceof ApiError
          ? err.details?.fornecedor?.[0] ?? err.message
          : 'Falha ao gravar o fornecedor.',
      );
    } finally {
      setFornecedorBusy(false);
    }
  };

  const syncMsgLower = (sync?.sync_mensagem ?? '').toLowerCase();
  const nenhumDocumentoFisco =
    syncMsgLower.includes('nenhum documento') ||
    (Boolean(sync?.primeira_hidratacao_completa) && (sync?.total_documentos ?? 0) === 0);

  const previewPodeConfirmar =
    fornecedorPreview?.status === 'ok' &&
    (fornecedorPreview.acao === 'criar' || fornecedorPreview.acao === 'adicionar_papel');

  return (
    <>
      <PageHeader
        title="NF-e destinadas"
        description="Caixa estacionária das notas emitidas contra o CNPJ desta empresa. Amarrar à OC alimenta o assist XML — o recebimento continua com conferência humana."
        actions={
          <>
            {podeEscrever && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={syncing || sync?.sync_status === 'RUNNING' || sync?.pode_sincronizar === false}
                onClick={() => void handleAtualizar()}
                title={sync?.sync_bloqueio ?? undefined}
              >
                {sync?.sync_status === 'RUNNING' || syncing ? 'Sincronizando…' : 'Atualizar do fisco'}
              </button>
            )}
            <Link to="/compras/ordens" className="btn btn-secondary">
              Ordens de compra
            </Link>
          </>
        }
      />

      {sync && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'baseline' }}>
            <div>
              <strong>Sincronização</strong>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                Status: {sync.sync_status}
                {sync.sync_mensagem ? ` — ${sync.sync_mensagem}` : ''}
                <br />
                {sync.ultima_sync_em
                  ? `Última atualização: ${formatDate(sync.ultima_sync_em)}`
                  : 'Ainda sem sync com o fisco nesta instalação.'}{' '}
                · {sync.total_documentos} documento(s) na caixa
                {sync.ano_alvo_hidratacao ? ` · meta 1ª carga: ${sync.ano_alvo_hidratacao}` : ''}
              </div>
            </div>
            <div className="muted" style={{ fontSize: '0.9rem', flex: 1, minWidth: 220 }}>
              {sync.sync_bloqueio
                ? sync.sync_bloqueio
                : 'Consulta DF-e em segundo plano. Sync delta diário na nuvem (06:15). Upload manual na OC permanece disponível.'}
            </div>
          </div>
          {(syncErro || acaoErro) && (
            <div className="card-body" style={{ paddingTop: 0, color: 'var(--danger, #b42318)' }}>
              {syncErro || acaoErro}
            </div>
          )}
        </div>
      )}

      {amarrarDoc && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <strong>Amarrar à OC</strong>
            <div className="muted" style={{ marginBottom: '0.75rem' }}>
              {amarrarDoc.emit_nome ?? 'Documento'} · NF {amarrarDoc.numero ?? '—'}
            </div>
            <div className="form-group" style={{ maxWidth: 420 }}>
              <label>Ordem de compra (ABERTA/PARCIAL)</label>
              <select value={ocId} onChange={(e) => setOcId(e.target.value)}>
                <option value="">Selecione…</option>
                {ocs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.codigo} — {o.fornecedor?.razao_social ?? 'fornecedor'} ({o.status})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!ocId || busyId === amarrarDoc.id}
                onClick={() => void confirmarAmarrar()}
              >
                Usar nesta OC
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setAmarrarDoc(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {(fornecedorDoc || fornecedorBusy) && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <strong>
              {fornecedorPreview?.acao === 'adicionar_papel'
                ? 'Adicionar papel fornecedor'
                : 'Cadastrar fornecedor a partir do XML'}
            </strong>
            <div className="muted" style={{ marginBottom: '0.75rem' }}>
              {fornecedorPreview?.preview.razao_social ??
                fornecedorDoc?.emit_nome ??
                'Emitente'}{' '}
              · NF {fornecedorDoc?.numero ?? '—'}
            </div>

            {fornecedorBusy && !fornecedorPreview ? (
              <div className="muted">Simulando cadastro a partir do XML do cofre…</div>
            ) : fornecedorPreview ? (
              <>
                <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  <div>
                    <strong>{fornecedorPreview.preview.razao_social ?? '—'}</strong>
                    {fornecedorPreview.preview.nome_fantasia ? (
                      <span className="muted"> · {fornecedorPreview.preview.nome_fantasia}</span>
                    ) : null}
                  </div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {formatCnpj(fornecedorPreview.preview.cnpj_cpf ?? null)}
                    {fornecedorPreview.preview.municipio
                      ? ` · ${fornecedorPreview.preview.municipio}`
                      : ''}
                    {fornecedorPreview.preview.uf ? `/${fornecedorPreview.preview.uf}` : ''}
                    {fornecedorPreview.preview.ie ? ` · IE ${fornecedorPreview.preview.ie}` : ''}
                  </div>
                  {fornecedorPreview.preview.parceiro_codigo && (
                    <div className="muted" style={{ fontSize: '0.9rem' }}>
                      Parceiro existente: {fornecedorPreview.preview.parceiro_codigo}
                    </div>
                  )}
                </div>

                {(fornecedorPreview.warnings?.length ?? 0) > 0 && (
                  <ul className="muted" style={{ margin: '0 0 0.75rem', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
                    {fornecedorPreview.warnings!.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}

                {fornecedorPreview.errors.length > 0 && (
                  <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.1rem', color: 'var(--danger, #b42318)' }}>
                    {fornecedorPreview.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}

                {fornecedorPreview.status === 'info' && fornecedorPreview.acao === 'nenhuma' && (
                  <div className="muted" style={{ marginBottom: '0.75rem' }}>
                    Emitente já cadastrado como fornecedor
                    {fornecedorPreview.preview.parceiro_codigo
                      ? ` (${fornecedorPreview.preview.parceiro_codigo})`
                      : ''}
                    .
                  </div>
                )}
              </>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              {previewPodeConfirmar && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={fornecedorBusy}
                  onClick={() => void confirmarFornecedor()}
                >
                  {fornecedorBusy
                    ? 'Gravando…'
                    : fornecedorPreview?.acao === 'adicionar_papel'
                      ? 'Confirmar papel fornecedor'
                      : 'Confirmar cadastro'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={fornecedorBusy}
                onClick={fecharFornecedor}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Chave, número, emitente, CNPJ…"
              />
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label>Ano</label>
              <select value={ano} onChange={(e) => setAno(e.target.value)}>
                <option value={String(anoAtual)}>{anoAtual}</option>
                <option value={String(anoAtual - 1)}>{anoAtual - 1}</option>
                <option value={String(anoAtual - 2)}>{anoAtual - 2}</option>
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Situação</label>
              <select value={situacao} onChange={(e) => setSituacao(e.target.value)}>
                <option value="">Todas</option>
                <option value="NOVA">Nova</option>
                <option value="DISPONIVEL">Disponível</option>
                <option value="AMARRADA">Amarrada</option>
                <option value="RECEBIDA">Recebida</option>
                <option value="SEM_INTERESSE">Sem interesse</option>
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary">
                Filtrar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              {sync?.sync_bloqueio ? (
                <>
                  {sync.sync_bloqueio} Enquanto isso, use o upload de XML na{' '}
                  <Link to="/compras/ordens">ordem de compra</Link>.
                </>
              ) : nenhumDocumentoFisco ? (
                <>
                  O fisco não liberou documentos destinados a esta empresa neste ambiente. Em
                  homologação a caixa costuma ficar vazia; em produção aparecem as NF-e emitidas
                  contra o CNPJ. Plano B:{' '}
                  <Link to="/compras/ordens">upload do XML na ordem de compra</Link>.
                </>
              ) : sync?.pode_sincronizar ? (
                <>
                  Nenhuma NF-e destinada neste filtro. Clique em Atualizar do fisco para buscar
                  documentos (em segundo plano).
                </>
              ) : (
                <>
                  Nenhuma NF-e destinada neste filtro. Em ambientes locais o sync com o fisco fica
                  desligado — use o upload de XML na <Link to="/compras/ordens">ordem de compra</Link>
                  .
                </>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="emissao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Emissão
                  </SortableTh>
                  <SortableTh column="emitente" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Emitente
                  </SortableTh>
                  <SortableTh
                    column="fornecedor"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Fornecedor
                  </SortableTh>
                  <SortableTh column="numero" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Número
                  </SortableTh>
                  <SortableTh column="valor" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Valor
                  </SortableTh>
                  <SortableTh column="situacao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Situação
                  </SortableTh>
                  <th>OC</th>
                  <th>XML</th>
                  {podeEscrever && <th className="acoes">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => {
                  const labelDoc =
                    d.numero != null
                      ? `NF ${d.serie ? `${d.serie}/` : ''}${d.numero}`
                      : `documento ${d.id}`;
                  const ocupado = busyId === d.id;
                  const f = d.fornecedor;
                  const pillLabel = fornecedorPillLabel(f?.status);
                  const clicavel =
                    f?.status === 'cadastrado' ||
                    (podeParceiro &&
                      (f?.status === 'nao_cadastrado' || f?.status === 'sem_papel'));
                  const title = fornecedorTitle(d, podeParceiro);

                  return (
                    <tr key={d.id}>
                      <td>{d.data_emissao ? formatDate(d.data_emissao) : '—'}</td>
                      <td>
                        <div>{d.emit_nome ?? '—'}</div>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          {formatCnpj(d.emit_cnpj)}
                        </div>
                      </td>
                      <td>
                        {!f || f.status === 'pf' || f.status === 'sem_cnpj' ? (
                          <span className="muted" title={title}>
                            {pillLabel}
                          </span>
                        ) : f.status === 'cadastrado' && f.parceiro_id ? (
                          <Link to={`/parceiros/${f.parceiro_id}`} title={title}>
                            <StatusPill status={pillLabel} />
                          </Link>
                        ) : clicavel && podeParceiro ? (
                          <button
                            type="button"
                            className="btn-link"
                            style={{
                              background: 'none',
                              border: 0,
                              padding: 0,
                              cursor: 'pointer',
                              font: 'inherit',
                            }}
                            disabled={ocupado || fornecedorBusy}
                            title={title}
                            aria-label={`${pillLabel} — ${labelDoc}`}
                            onClick={() => void abrirFornecedor(d)}
                          >
                            <StatusPill status={pillLabel} />
                          </button>
                        ) : (
                          <span title={title}>
                            <StatusPill status={pillLabel} />
                          </span>
                        )}
                      </td>
                      <td>
                        {d.serie ? `${d.serie}/` : ''}
                        {d.numero ?? '—'}
                      </td>
                      <td>{d.valor_total != null ? formatCurrency(Number(d.valor_total)) : '—'}</td>
                      <td>
                        <StatusPill status={d.situacao} />
                      </td>
                      <td>
                        {d.ordem_compra ? (
                          <Link to={`/compras/ordens/${d.ordem_compra.id}?dfe=${d.id}`}>
                            {d.ordem_compra.codigo}
                          </Link>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {d.tem_xml ? (
                          <button
                            type="button"
                            className="btn-icon"
                            disabled={ocupado}
                            title="Baixar XML oficial do fisco (já na caixa)"
                            aria-label={`Baixar XML de ${labelDoc}`}
                            onClick={() => void baixarXml(d)}
                          >
                            <IconDownload />
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      {podeEscrever && (
                        <td className="acoes">
                          <div className="table-actions">
                            {!d.tem_xml && d.situacao !== 'SEM_INTERESSE' && d.situacao !== 'RECEBIDA' && (
                              <button
                                type="button"
                                className="btn-icon"
                                disabled={ocupado}
                                title="Buscar XML no fisco"
                                aria-label={`Buscar XML de ${labelDoc}`}
                                onClick={() => void buscarXml(d)}
                              >
                                <IconCloudDownload />
                              </button>
                            )}
                            {d.tem_xml && d.situacao !== 'RECEBIDA' && d.situacao !== 'SEM_INTERESSE' && (
                              <button
                                type="button"
                                className="btn-icon"
                                disabled={ocupado}
                                title="Amarrar à ordem de compra"
                                aria-label={`Amarrar ${labelDoc} à OC`}
                                onClick={() => void abrirAmarrar(d)}
                              >
                                <IconLink />
                              </button>
                            )}
                            {d.situacao !== 'RECEBIDA' && d.situacao !== 'SEM_INTERESSE' && (
                              <button
                                type="button"
                                className="btn-icon"
                                disabled={ocupado}
                                title="Marcar sem interesse"
                                aria-label={`Marcar ${labelDoc} sem interesse`}
                                onClick={() => void semInteresse(d)}
                              >
                                <IconBan />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
