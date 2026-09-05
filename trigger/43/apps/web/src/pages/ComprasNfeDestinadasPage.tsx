import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, ApiError, type DfeDocumento, type DfeSyncEstado, type OrdemCompra } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  emissao: (d: DfeDocumento) => d.data_emissao,
  emitente: (d: DfeDocumento) => d.emit_nome,
  numero: (d: DfeDocumento) => d.numero,
  valor: (d: DfeDocumento) => Number(d.valor_total ?? 0),
  situacao: (d: DfeDocumento) => d.situacao,
};

function formatCnpj(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—';
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
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
  const pollRef = useRef<number | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(docs, SORT);
  const podeEscrever = hasPermission('compras.escrever');

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

  const syncMsgLower = (sync?.sync_mensagem ?? '').toLowerCase();
  const nenhumDocumentoFisco =
    syncMsgLower.includes('nenhum documento') ||
    (Boolean(sync?.primeira_hidratacao_completa) && (sync?.total_documentos ?? 0) === 0);

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
                  {podeEscrever && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => (
                  <tr key={d.id}>
                    <td>{d.data_emissao ? formatDate(d.data_emissao) : '—'}</td>
                    <td>
                      <div>{d.emit_nome ?? '—'}</div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {formatCnpj(d.emit_cnpj)}
                      </div>
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
                          className="btn btn-secondary"
                          style={{ fontSize: '0.85rem' }}
                          disabled={busyId === d.id}
                          title="Baixar XML oficial do fisco (já na caixa)"
                          onClick={() => void baixarXml(d)}
                        >
                          Baixar
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    {podeEscrever && (
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {!d.tem_xml && d.situacao !== 'SEM_INTERESSE' && d.situacao !== 'RECEBIDA' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.85rem' }}
                              disabled={busyId === d.id}
                              onClick={() => void buscarXml(d)}
                            >
                              Buscar XML
                            </button>
                          )}
                          {d.tem_xml && d.situacao !== 'RECEBIDA' && d.situacao !== 'SEM_INTERESSE' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.85rem' }}
                              disabled={busyId === d.id}
                              onClick={() => void abrirAmarrar(d)}
                            >
                              Amarrar OC
                            </button>
                          )}
                          {d.situacao !== 'RECEBIDA' && d.situacao !== 'SEM_INTERESSE' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: '0.85rem' }}
                              disabled={busyId === d.id}
                              onClick={() => void semInteresse(d)}
                            >
                              Sem interesse
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
