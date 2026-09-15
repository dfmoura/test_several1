import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconAlertCircle,
  IconBan,
  IconCheck,
  IconCloudDownload,
  IconDownload,
  IconLink,
  IconMinus,
} from '../components/NavIcons';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import {
  api,
  ApiError,
  type DfeDocumento,
  type DfeFornecedorStatus,
  type DfeSyncEstado,
  type DfeTransportadorStatus,
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
  transportador: (d: DfeDocumento) => d.transportador?.status ?? '',
};

type ParceiroPreviewRow = {
  line: number;
  status: 'ok' | 'info' | 'erro' | string;
  acao?: 'criar' | 'adicionar_papel' | 'adicionar_papel_transportadora' | 'nenhuma' | null;
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

type CadastroPapel = 'fornecedor' | 'transportador';

function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—';
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function cadastroVariant(status: string | undefined): 'ok' | 'warn' | 'na' {
  switch (status) {
    case 'cadastrado':
      return 'ok';
    case 'nao_cadastrado':
    case 'sem_papel':
      return 'warn';
    default:
      return 'na';
  }
}

function cadastroLabel(papel: CadastroPapel, status: string | undefined): string {
  const entidade = papel === 'fornecedor' ? 'Fornecedor' : 'Transportador';
  switch (status) {
    case 'cadastrado':
      return `${entidade} cadastrado`;
    case 'sem_papel':
      return `Parceiro sem papel ${papel === 'fornecedor' ? 'fornecedor' : 'transportadora'}`;
    case 'nao_cadastrado':
      return `${entidade} não cadastrado`;
    case 'pf':
      return 'Documento PF — cadastro via XML aplica-se a PJ';
    case 'sem_cnpj':
      return 'Sem CNPJ no XML';
    case 'ausente':
      return 'Transportador ausente no XML';
    case 'sem_xml':
      return 'Busque o XML para ver o transportador';
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

function transportadorTitle(doc: DfeDocumento, podeParceiro: boolean): string {
  const t = doc.transportador;
  if (!t) return '';
  const nome = t.razao_social ?? t.nome_xml;
  if (t.status === 'cadastrado') {
    const base = t.codigo ? `Transportador ${t.codigo}` : 'Transportador cadastrado';
    return nome ? `${base} — ${nome}` : base;
  }
  if (t.status === 'ausente') {
    return 'Esta NF-e não informa transportador (grupo transporta).';
  }
  if (t.status === 'sem_xml') {
    return 'Busque o XML no fisco antes de ver ou cadastrar o transportador.';
  }
  if (t.status === 'pf' || t.status === 'sem_cnpj') {
    return nome
      ? `${nome} — cadastro via XML aplica-se a transportador PJ com CNPJ.`
      : 'Cadastro via XML aplica-se a transportador PJ com CNPJ.';
  }
  if (!podeParceiro) {
    return 'Sem permissão para cadastrar parceiro.';
  }
  if (t.status === 'sem_papel') {
    return nome
      ? `${nome} — parceiro sem papel transportadora; clique para adicionar via XML.`
      : 'Parceiro existe sem classificação transportadora — clique para adicionar o papel via XML.';
  }
  return nome
    ? `${nome} — clique para cadastrar como transportadora a partir do XML.`
    : 'Clique para simular o cadastro do transportador a partir do XML da nota.';
}

function CadastroStatusIcon({
  status,
  title,
  ariaLabel,
}: {
  status: DfeFornecedorStatus | DfeTransportadorStatus | undefined;
  title: string;
  ariaLabel: string;
}) {
  const variant = cadastroVariant(status);
  let icon: ReactNode;
  if (variant === 'ok') icon = <IconCheck />;
  else if (variant === 'warn') icon = <IconAlertCircle />;
  else icon = <IconMinus />;

  return (
    <span
      className={`dfe-cadastro-icon dfe-cadastro-icon--${variant}`}
      title={title}
      aria-label={ariaLabel}
    >
      {icon}
    </span>
  );
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
  const [cadastroPapel, setCadastroPapel] = useState<CadastroPapel | null>(null);
  const [cadastroDoc, setCadastroDoc] = useState<DfeDocumento | null>(null);
  const [cadastroPreview, setCadastroPreview] = useState<ParceiroPreviewRow | null>(null);
  const [cadastroBusy, setCadastroBusy] = useState(false);
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

  const fecharCadastro = () => {
    setCadastroPapel(null);
    setCadastroDoc(null);
    setCadastroPreview(null);
    setCadastroBusy(false);
  };

  const abrirAmarrar = async (doc: DfeDocumento) => {
    setAcaoErro(null);
    fecharCadastro();
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

  const abrirCadastro = async (papel: CadastroPapel, doc: DfeDocumento) => {
    const info = papel === 'fornecedor' ? doc.fornecedor : doc.transportador;
    if (!info) return;

    if (info.status === 'cadastrado' && info.parceiro_id) {
      navigate(`/parceiros/${info.parceiro_id}`);
      return;
    }

    if (!podeParceiro || !info.pode_cadastrar) return;
    if (!doc.tem_xml) {
      setAcaoErro('Busque o XML no fisco antes de cadastrar o parceiro.');
      return;
    }

    setAmarrarDoc(null);
    setAcaoErro(null);
    setCadastroPapel(papel);
    setCadastroDoc(doc);
    setCadastroPreview(null);
    setCadastroBusy(true);

    const path =
      papel === 'fornecedor'
        ? `/dfe-documentos/${doc.id}/fornecedor/preview`
        : `/dfe-documentos/${doc.id}/transportador/preview`;

    try {
      const res = await api.post<{ data: { row: ParceiroPreviewRow } }>(path, {});
      setCadastroPreview(res.data.row);
    } catch (err) {
      const key = papel === 'fornecedor' ? 'fornecedor' : 'transportador';
      setAcaoErro(
        err instanceof ApiError
          ? err.details?.[key]?.[0] ?? err.message
          : `Falha ao simular cadastro do ${papel}.`,
      );
      fecharCadastro();
    } finally {
      setCadastroBusy(false);
    }
  };

  const confirmarCadastro = async () => {
    if (!cadastroDoc || !cadastroPapel || !cadastroPreview) return;
    if (
      cadastroPreview.acao !== 'criar' &&
      cadastroPreview.acao !== 'adicionar_papel' &&
      cadastroPreview.acao !== 'adicionar_papel_transportadora'
    ) {
      return;
    }

    setCadastroBusy(true);
    setAcaoErro(null);
    const path =
      cadastroPapel === 'fornecedor'
        ? `/dfe-documentos/${cadastroDoc.id}/fornecedor/commit`
        : `/dfe-documentos/${cadastroDoc.id}/transportador/commit`;

    try {
      await api.post(path, {});
      fecharCadastro();
      void load(q, situacao, ano);
    } catch (err) {
      const key = cadastroPapel === 'fornecedor' ? 'fornecedor' : 'transportador';
      setAcaoErro(
        err instanceof ApiError
          ? err.details?.[key]?.[0] ?? err.message
          : `Falha ao gravar o ${cadastroPapel}.`,
      );
    } finally {
      setCadastroBusy(false);
    }
  };

  const previewPodeConfirmar =
    cadastroPreview?.status === 'ok' &&
    (cadastroPreview.acao === 'criar' ||
      cadastroPreview.acao === 'adicionar_papel' ||
      cadastroPreview.acao === 'adicionar_papel_transportadora');

  const nenhumDocumentoFisco = docs.length === 0 && !q && !situacao;
  const syncRodando = syncing || sync?.sync_status === 'RUNNING';

  const renderCadastroCell = (
    papel: CadastroPapel,
    doc: DfeDocumento,
    ocupado: boolean,
    labelDoc: string,
  ) => {
    const info = papel === 'fornecedor' ? doc.fornecedor : doc.transportador;
    const status = info?.status;
    const title =
      papel === 'fornecedor'
        ? fornecedorTitle(doc, podeParceiro)
        : transportadorTitle(doc, podeParceiro);
    const label = cadastroLabel(papel, status);
    const clicavel =
      status === 'cadastrado' ||
      (podeParceiro && (status === 'nao_cadastrado' || status === 'sem_papel') && info?.pode_cadastrar);
    const icon = (
      <CadastroStatusIcon status={status} title={title} ariaLabel={`${label} — ${labelDoc}`} />
    );

    if (status === 'cadastrado' && info?.parceiro_id) {
      return (
        <Link to={`/parceiros/${info.parceiro_id}`} title={title} className="dfe-cadastro-link">
          {icon}
        </Link>
      );
    }

    if (clicavel && podeParceiro && info?.pode_cadastrar) {
      return (
        <button
          type="button"
          className="dfe-cadastro-btn"
          disabled={ocupado || cadastroBusy}
          title={title}
          aria-label={`${label} — ${labelDoc}`}
          onClick={() => void abrirCadastro(papel, doc)}
        >
          {icon}
        </button>
      );
    }

    return icon;
  };

  return (
    <>
      <PageHeader
        title="Caixa de NF-e"
        description="Notas emitidas contra o CNPJ da empresa, carregadas do fisco. Amarrar à OC e receber na ordem."
        actions={
          podeEscrever ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={syncRodando || sync?.pode_sincronizar === false}
              title={sync?.sync_bloqueio ?? undefined}
              onClick={() => void handleAtualizar()}
            >
              {syncRodando ? 'Atualizando…' : 'Atualizar do fisco'}
            </button>
          ) : undefined
        }
      />

      <div className="nfe-destinadas-chrome">
        {sync && (
          <div className="nfe-destinadas-sync" aria-label="Sincronização DF-e">
            <div className="nfe-destinadas-metric">
              <span>Status</span>
              <strong>
                {sync.sync_status}
                {sync.sync_mensagem ? (
                  <em className="nfe-destinadas-metric-msg"> — {sync.sync_mensagem}</em>
                ) : null}
              </strong>
            </div>
            <div className="nfe-destinadas-metric">
              <span>NSU</span>
              <strong>{sync.ultimo_nsu}</strong>
            </div>
            <div className="nfe-destinadas-metric">
              <span>Documentos</span>
              <strong>{sync.total_documentos}</strong>
            </div>
            {sync.sync_bloqueio && (
              <p
                className="nfe-destinadas-sync-hint"
                role="status"
              >
                {sync.sync_bloqueio}
              </p>
            )}
          </div>
        )}

        {(syncErro || acaoErro) && (
          <div className="nfe-destinadas-erro" role="alert">
            {syncErro ?? acaoErro}
          </div>
        )}

        <form onSubmit={handleSearch} className="nfe-destinadas-filters">
          <input
            className="nfe-destinadas-search"
            placeholder="Buscar chave, número, emitente, transportador…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="nfe-destinadas-select"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            aria-label="Ano"
          >
            {[anoAtual, anoAtual - 1, anoAtual - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="nfe-destinadas-select nfe-destinadas-select--situacao"
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
            aria-label="Situação"
          >
            <option value="">Todas as situações</option>
            <option value="NOVA">Nova</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="AMARRADA">Amarrada</option>
            <option value="RECEBIDA">Recebida</option>
            <option value="SEM_INTERESSE">Sem interesse</option>
          </select>
          <button type="submit" className="btn btn-secondary">
            Filtrar
          </button>
        </form>
      </div>

      {amarrarDoc && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <strong>Amarrar à ordem de compra</strong>
            <div className="muted" style={{ marginBottom: '0.75rem' }}>
              {amarrarDoc.emit_nome ?? 'Emitente'} · NF {amarrarDoc.numero ?? '—'}
            </div>
            <label className="field">
              <span>OC aberta ou parcial</span>
              <select value={ocId} onChange={(e) => setOcId(e.target.value)}>
                <option value="">Selecione…</option>
                {ocs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.codigo} — {o.status}
                  </option>
                ))}
              </select>
            </label>
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

      {(cadastroDoc || cadastroBusy) && cadastroPapel && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <strong>
              {cadastroPreview?.acao === 'adicionar_papel' ||
              cadastroPreview?.acao === 'adicionar_papel_transportadora'
                ? `Adicionar papel ${cadastroPapel === 'fornecedor' ? 'fornecedor' : 'transportadora'}`
                : `Cadastrar ${cadastroPapel} a partir do XML`}
            </strong>
            <div className="muted" style={{ marginBottom: '0.75rem' }}>
              {cadastroPreview?.preview.razao_social ??
                (cadastroPapel === 'fornecedor'
                  ? cadastroDoc?.emit_nome
                  : cadastroDoc?.transportador?.nome_xml ?? cadastroDoc?.transp_nome) ??
                'Parceiro'}{' '}
              · NF {cadastroDoc?.numero ?? '—'}
            </div>

            {cadastroBusy && !cadastroPreview ? (
              <div className="muted">Simulando cadastro a partir do XML do cofre…</div>
            ) : cadastroPreview ? (
              <>
                <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  <div>
                    <strong>{cadastroPreview.preview.razao_social ?? '—'}</strong>
                    {cadastroPreview.preview.nome_fantasia ? (
                      <span className="muted"> · {cadastroPreview.preview.nome_fantasia}</span>
                    ) : null}
                  </div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {formatCnpj(cadastroPreview.preview.cnpj_cpf ?? null)}
                    {cadastroPreview.preview.municipio
                      ? ` · ${cadastroPreview.preview.municipio}`
                      : ''}
                    {cadastroPreview.preview.uf ? `/${cadastroPreview.preview.uf}` : ''}
                    {cadastroPreview.preview.ie ? ` · IE ${cadastroPreview.preview.ie}` : ''}
                  </div>
                  {cadastroPreview.preview.parceiro_codigo && (
                    <div className="muted" style={{ fontSize: '0.9rem' }}>
                      Parceiro existente: {cadastroPreview.preview.parceiro_codigo}
                    </div>
                  )}
                </div>

                {(cadastroPreview.warnings?.length ?? 0) > 0 && (
                  <ul
                    className="muted"
                    style={{ margin: '0 0 0.75rem', paddingLeft: '1.1rem', fontSize: '0.9rem' }}
                  >
                    {cadastroPreview.warnings!.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}

                {cadastroPreview.errors.length > 0 && (
                  <ul
                    style={{
                      margin: '0 0 0.75rem',
                      paddingLeft: '1.1rem',
                      color: 'var(--danger, #b42318)',
                    }}
                  >
                    {cadastroPreview.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}

                {cadastroPreview.status === 'info' && cadastroPreview.acao === 'nenhuma' && (
                  <div className="muted" style={{ marginBottom: '0.75rem' }}>
                    Já cadastrado
                    {cadastroPreview.preview.parceiro_codigo
                      ? ` (${cadastroPreview.preview.parceiro_codigo})`
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
                  disabled={cadastroBusy}
                  onClick={() => void confirmarCadastro()}
                >
                  {cadastroBusy
                    ? 'Gravando…'
                    : cadastroPreview?.acao === 'adicionar_papel' ||
                        cadastroPreview?.acao === 'adicionar_papel_transportadora'
                      ? `Confirmar papel ${cadastroPapel === 'fornecedor' ? 'fornecedor' : 'transportadora'}`
                      : 'Confirmar cadastro'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                disabled={cadastroBusy}
                onClick={fecharCadastro}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Nenhuma nota carregada nesta caixa. Em homologação o fisco costuma não liberar
                  documentos; em produção aparecem as NF-e emitidas contra o CNPJ. Plano B:{' '}
                  <Link to="/compras/ordens">upload do XML na ordem de compra</Link>.
                </>
              ) : sync?.pode_sincronizar ? (
                <>
                  Nenhuma NF-e carregada neste filtro. Clique em Atualizar do fisco para trazer
                  documentos à caixa (em segundo plano).
                </>
              ) : (
                <>
                  Nenhuma NF-e carregada neste filtro. Em ambientes locais o sync com o fisco fica
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
                    <span title="Fornecedor cadastrado?">Forn.</span>
                  </SortableTh>
                  <SortableTh
                    column="transportador"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    <span title="Transportador cadastrado?">Transp.</span>
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

                  return (
                    <tr key={d.id}>
                      <td>{d.data_emissao ? formatDate(d.data_emissao) : '—'}</td>
                      <td>
                        <div>{d.emit_nome ?? '—'}</div>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          {formatCnpj(d.emit_cnpj)}
                        </div>
                      </td>
                      <td className="dfe-cadastro-cell">
                        {renderCadastroCell('fornecedor', d, ocupado, labelDoc)}
                      </td>
                      <td className="dfe-cadastro-cell">
                        {renderCadastroCell('transportador', d, ocupado, labelDoc)}
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
