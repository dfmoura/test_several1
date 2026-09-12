import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type EstoqueLote, type EstoqueMovimento, type EstoqueSaldo } from '../lib/api';
import {
  coincideBusca,
  formatValorPosicao,
  mesmaQtdeEstoque,
  movTipoLabel,
  qtdeKardex,
  somaValorPosicao,
  textoBusca,
} from '../lib/estoqueUi';
import { familiaLabel, formatCurrency, formatDate, formatQty, formatQtyCompact } from '../lib/format';
import { IconMapPin, IconRastreio, IconTag } from '../components/NavIcons';
import { useAuth } from '../lib/auth';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';
import { useTableSort } from '../lib/useTableSort';
import { formatVolumeDimensao } from '../lib/volumeEtiquetaPrint';

type TabId = 'saldos' | 'lotes' | 'movimentos';

const SORT_SALDO = {
  produto: (s: EstoqueSaldo) => s.produto?.codigo,
  familia: (s: EstoqueSaldo) => s.produto?.familia,
  qtde: (s: EstoqueSaldo) => Number(s.qtde),
  volumes: (s: EstoqueSaldo) => (s.controla_lote ? (s.lotes_count ?? 0) : -1),
  custo: (s: EstoqueSaldo) => Number(s.custo_medio),
  valor: (s: EstoqueSaldo) => Number(s.qtde) * Number(s.custo_medio),
  validade: (s: EstoqueSaldo) => s.proxima_validade || s.validade_status,
};

const SORT_MOV = {
  codigo: (m: EstoqueMovimento) => m.codigo,
  tipo: (m: EstoqueMovimento) => movTipoLabel(m.tipo),
  documento: (m: EstoqueMovimento) => m.nf_numero || m.ordem_compra?.codigo || m.codigo,
  sku: (m: EstoqueMovimento) => m.itens?.[0]?.produto?.codigo,
  conferido: (m: EstoqueMovimento) => m.conferido_em,
};

const SORT_LOTE = {
  produto: (l: EstoqueLote) => l.produto?.codigo,
  codigo: (l: EstoqueLote) => l.codigo,
  dimensao: (l: EstoqueLote) =>
    formatVolumeDimensao(l.largura_mm ?? null, l.comprimento_m ?? null),
  entrada: (l: EstoqueLote) => l.data_entrada,
  validade: (l: EstoqueLote) => l.data_validade,
  qtde: (l: EstoqueLote) => Number(l.qtde),
  status: (l: EstoqueLote) => l.status,
};

const TAB_HINT: Record<TabId, string> = {
  saldos:
    'Posição oficial por SKU. Selecione a linha para ver o consolidado físico (qtde × volumes).',
  lotes: 'Volume = bobina (nLote). Dimensão real L×C, etiqueta/QR e local. Consumo FEFO se lote omitido na baixa.',
  movimentos: 'Todo saldo nasce de um MOV. Compra, produção, sobra, PA e ajuste aprovado.',
};

/** Subtotal de apresentação: qtde da faixa × N volumes (não altera saldo oficial). */
function subtotalFaixa(qtde: string, volumes: number): string {
  const n = Number(qtde) * volumes;
  if (!Number.isFinite(n)) return '—';
  return formatQty(n);
}

/** Validade na grade: pill só quando crítico; OK/sem validade = texto leve. */
function validadeResumo(
  status: string | null | undefined,
  proxima: string | null | undefined,
) {
  const critico = status === 'VENCIDO' || status === 'A_VENCER';
  if (critico) {
    return (
      <>
        <StatusPill status={validadeStatusLabel(status)} />
        {proxima ? <div className="table-muted">{formatDate(proxima)}</div> : null}
      </>
    );
  }
  if (proxima) {
    return <span className="table-muted">{formatDate(proxima)}</span>;
  }
  if (status) {
    return <span className="table-muted">{validadeStatusLabel(status)}</span>;
  }
  return <span className="muted">—</span>;
}

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

function movimentoDocumento(m: EstoqueMovimento): string {
  if (m.nf_numero) return `NF ${m.nf_numero}`;
  if (m.ordem_compra?.codigo) return m.ordem_compra.codigo;
  if (m.ajuste_id && m.motivo_codigo) return m.motivo_codigo;
  return '—';
}

export function EstoquePage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [saldos, setSaldos] = useState<EstoqueSaldo[]>([]);
  const [movs, setMovs] = useState<EstoqueMovimento[]>([]);
  const [lotes, setLotes] = useState<EstoqueLote[]>([]);
  const [tab, setTab] = useState<TabId>('saldos');
  const [q, setQ] = useState('');
  const [validadeFiltro, setValidadeFiltro] = useState('');
  const [produtoLoteFiltro, setProdutoLoteFiltro] = useState<number | null>(null);
  const [qtdeVolumeFiltro, setQtdeVolumeFiltro] = useState<string | null>(null);
  const [dimVolumeFiltro, setDimVolumeFiltro] = useState<{
    largura_mm: string | null;
    comprimento_m: string | null;
  } | null>(null);
  const [saldoSelecionadoId, setSaldoSelecionadoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const alertas = useMemo(() => {
    const vencidos = lotes.filter((l) => l.status === 'VENCIDO' && Number(l.qtde) > 0).length;
    const aVencer = lotes.filter((l) => l.status === 'A_VENCER' && Number(l.qtde) > 0).length;
    return { vencidos, aVencer };
  }, [lotes]);

  const saldosFiltrados = useMemo(() => {
    return saldos.filter((s) =>
      coincideBusca(
        textoBusca(
          s.produto?.codigo,
          s.produto?.descricao_comercial,
          s.produto?.descricao_fiscal,
          s.produto?.familia,
        ),
        q,
      ),
    );
  }, [saldos, q]);

  const lotesFiltrados = useMemo(() => {
    return lotes.filter((l) => {
      if (validadeFiltro && l.status !== validadeFiltro) return false;
      if (produtoLoteFiltro && l.produto_id !== produtoLoteFiltro) return false;
      if (qtdeVolumeFiltro && !mesmaQtdeEstoque(l.qtde, qtdeVolumeFiltro)) return false;
      if (qtdeVolumeFiltro && Number(l.qtde) <= 0) return false;
      if (dimVolumeFiltro) {
        const mesmaL = (l.largura_mm ?? null) === (dimVolumeFiltro.largura_mm ?? null);
        const mesmaC =
          (l.comprimento_m ?? null) === (dimVolumeFiltro.comprimento_m ?? null);
        if (!mesmaL || !mesmaC) return false;
      }
      return coincideBusca(
        textoBusca(
          l.produto?.codigo,
          l.produto?.descricao_fiscal,
          l.codigo,
          l.status_label,
          formatVolumeDimensao(l.largura_mm ?? null, l.comprimento_m ?? null),
        ),
        q,
      );
    });
  }, [lotes, q, validadeFiltro, produtoLoteFiltro, qtdeVolumeFiltro, dimVolumeFiltro]);

  const movsFiltrados = useMemo(() => {
    return movs.filter((m) =>
      coincideBusca(
        textoBusca(
          m.codigo,
          movTipoLabel(m.tipo),
          m.nf_numero,
          m.nf_chave,
          m.ordem_compra?.codigo,
          m.fornecedor?.razao_social,
          m.fornecedor?.nome_fantasia,
          m.itens?.[0]?.produto?.codigo,
          m.motivo_codigo,
        ),
        q,
      ),
    );
  }, [movs, q]);

  const saldosSort = useTableSort(saldosFiltrados, SORT_SALDO);
  const movsSort = useTableSort(movsFiltrados, SORT_MOV);
  const lotesSort = useTableSort(lotesFiltrados, SORT_LOTE);

  const saldoSelecionado = useMemo(() => {
    if (saldoSelecionadoId == null) return null;
    return saldosFiltrados.find((s) => s.id === saldoSelecionadoId) ?? null;
  }, [saldosFiltrados, saldoSelecionadoId]);

  useEffect(() => {
    if (saldoSelecionadoId == null) return;
    if (!saldosFiltrados.some((s) => s.id === saldoSelecionadoId)) {
      setSaldoSelecionadoId(null);
    }
  }, [saldosFiltrados, saldoSelecionadoId]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [s, m, l] = await Promise.all([
          api.get<{ data: EstoqueSaldo[] }>('/estoque/saldos'),
          api.get<{ data: EstoqueMovimento[] }>('/estoque/movimentos'),
          api.get<{ data: EstoqueLote[] }>('/estoque/lotes'),
        ]);
        setSaldos(s.data);
        setMovs(m.data);
        setLotes(l.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const abrirLotesCriticos = (status: 'VENCIDO' | 'A_VENCER') => {
    setTab('lotes');
    setProdutoLoteFiltro(null);
    setQtdeVolumeFiltro(null);
    setDimVolumeFiltro(null);
    setValidadeFiltro(status);
  };

  const abrirVolumesDoSku = (produtoId: number, produtoCodigo?: string | null) => {
    setTab('lotes');
    setValidadeFiltro('');
    setProdutoLoteFiltro(produtoId);
    setQtdeVolumeFiltro(null);
    setDimVolumeFiltro(null);
    setQ(produtoCodigo?.trim() || '');
  };

  const abrirVolumesPorQtde = (
    produtoId: number,
    qtde: string,
    produtoCodigo?: string | null,
    dim?: { largura_mm?: string | null; comprimento_m?: string | null } | null,
  ) => {
    setTab('lotes');
    setValidadeFiltro('');
    setProdutoLoteFiltro(produtoId);
    setQtdeVolumeFiltro(qtde);
    setDimVolumeFiltro(
      dim
        ? {
            largura_mm: dim.largura_mm ?? null,
            comprimento_m: dim.comprimento_m ?? null,
          }
        : null,
    );
    setQ(produtoCodigo?.trim() || '');
  };

  const limparFiltroVolumes = () => {
    setProdutoLoteFiltro(null);
    setQtdeVolumeFiltro(null);
    setDimVolumeFiltro(null);
    setQ('');
  };

  return (
    <div className="estoque-posicao-page">
      <PageHeader
        title="Estoque"
        description="Saldo em unidade interna. Nada entra ou sai sem documento — compra (NF na OC), OP, sobra, PA ou ajuste aprovado."
        actions={
          <div className="btn-row">
            {hasPermission('produto.ler') ? (
              <Link to="/produtos" className="btn btn-secondary btn-sm">
                Produtos
              </Link>
            ) : null}
            <Link to="/compras/reposicao" className="btn btn-secondary btn-sm">
              A repor
            </Link>
            <Link to="/compras/ordens" className="btn btn-primary btn-sm">
              Receber por OC / NF-e
            </Link>
          </div>
        }
      />

      <EstoqueModuleNav />

      <p className="estoque-ops-line muted">
        Entrada na{' '}
        <Link to="/compras/ordens">ordem de compra</Link>
        {' · '}
        <Link to="/estoque/guardar">Guardar</Link>
        {' · '}
        <Link to="/estoque/lotes/etiquetas">Reimprimir volumes</Link>
        {' · '}
        <Link to="/estoque/enderecos/etiquetas">Etiquetas dos locais</Link>
      </p>

      {!loading && (
        <div className="estoque-kpi detail-meta" aria-label="Resumo da posição">
          <div>
            <span>SKUs</span>
            <strong>{saldos.length}</strong>
          </div>
          <div>
            <span>Valor</span>
            <strong>{somaValorPosicao(saldos)}</strong>
          </div>
          <div>
            <span>Volumes</span>
            <strong>{lotes.filter((l) => Number(l.qtde) > 0).length}</strong>
          </div>
          <div>
            <span>MOV</span>
            <strong>{movs.length}</strong>
          </div>
        </div>
      )}

      {(alertas.vencidos > 0 || alertas.aVencer > 0) && (
        <div
          className={`alert alert--compact ${alertas.vencidos > 0 ? 'alert-error' : 'alert-warning'}`}
          style={{ marginBottom: '0.75rem' }}
        >
          {alertas.vencidos > 0 && (
            <button
              type="button"
              className="linkish"
              onClick={() => abrirLotesCriticos('VENCIDO')}
            >
              {alertas.vencidos} vencido(s)
            </button>
          )}
          {alertas.vencidos > 0 && alertas.aVencer > 0 ? <span> · </span> : null}
          {alertas.aVencer > 0 && (
            <button
              type="button"
              className="linkish"
              onClick={() => abrirLotesCriticos('A_VENCER')}
            >
              {alertas.aVencer} a vencer
            </button>
          )}
          <span className="muted"> — Volumes</span>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Visões da posição">
        {(
          [
            ['saldos', 'Por produto', saldosFiltrados.length],
            ['lotes', 'Volumes', lotesFiltrados.length],
            ['movimentos', 'Movimentos', movsFiltrados.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`tab${tab === id ? ' active' : ''}`}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
            <span className="tab-count">{count}</span>
          </button>
        ))}
      </div>
      <p className="catalogo-tab-hint">{TAB_HINT[tab]}</p>

      <div className="card estoque-filtros-card">
        <div className="card-body">
          <div className="form-grid" style={{ alignItems: 'end' }}>
            <div className="form-group span-2">
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  tab === 'saldos'
                    ? 'SKU, descrição, família…'
                    : tab === 'lotes'
                      ? 'SKU, lote…'
                      : 'MOV, NF, OC, fornecedor…'
                }
              />
            </div>
            {tab === 'lotes' ? (
              <div className="form-group">
                <label>Validade</label>
                <select value={validadeFiltro} onChange={(e) => setValidadeFiltro(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="VENCIDO">Vencidos</option>
                  <option value="A_VENCER">A vencer</option>
                  <option value="OK">No prazo</option>
                  <option value="SEM_VALIDADE">Sem validade</option>
                </select>
              </div>
            ) : null}
            {tab === 'lotes' && (produtoLoteFiltro || qtdeVolumeFiltro) ? (
              <div className="form-group">
                <label>
                  {qtdeVolumeFiltro
                    ? `SKU · ${formatQtyCompact(qtdeVolumeFiltro)}${
                        dimVolumeFiltro
                          ? ` · ${formatVolumeDimensao(
                              dimVolumeFiltro.largura_mm,
                              dimVolumeFiltro.comprimento_m,
                            )}`
                          : ''
                      }`
                    : 'SKU'}
                </label>
                <button type="button" className="linkish" onClick={limparFiltroVolumes}>
                  Limpar filtro
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : tab === 'saldos' ? (
            saldosSort.sorted.length === 0 ? (
              <div className="empty-state">
                {q
                  ? 'Nenhum saldo com este filtro.'
                  : 'Sem saldo. Receba uma OC para gerar a primeira entrada.'}
              </div>
            ) : (
              <table className="data-table estoque-dense-table">
                <thead>
                  <tr>
                    <SortableTh
                      column="produto"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Produto
                    </SortableTh>
                    <SortableTh
                      column="familia"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Família
                    </SortableTh>
                    <SortableTh
                      column="qtde"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                      className="num"
                    >
                      Saldo
                    </SortableTh>
                    <SortableTh
                      column="volumes"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                      className="num"
                    >
                      Volumes
                    </SortableTh>
                    <SortableTh
                      column="custo"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                      className="num"
                    >
                      Custo médio
                    </SortableTh>
                    <SortableTh
                      column="valor"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                      className="num"
                    >
                      Valor
                    </SortableTh>
                    <SortableTh
                      column="validade"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Validade
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {saldosSort.sorted.map((s) => {
                    const selecionar = () => setSaldoSelecionadoId(s.id);
                    const desc =
                      s.produto?.descricao_comercial || s.produto?.descricao_fiscal || '';
                    return (
                      <tr
                        key={s.id}
                        className={`clickable${saldoSelecionadoId === s.id ? ' is-selected' : ''}`}
                        tabIndex={0}
                        onClick={selecionar}
                        onKeyDown={(e) => activateRow(e, selecionar)}
                      >
                        <td className="produto">
                          <strong>{s.produto?.codigo}</strong>
                          {desc ? (
                            <div className="muted" title={desc}>
                              {desc}
                            </div>
                          ) : null}
                        </td>
                        <td className="familia">
                          {s.produto?.familia ? (
                            <span title={familiaLabel(s.produto.familia)}>
                              {s.produto.familia}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="num saldo-cell">
                          <strong>{formatQty(s.qtde)}</strong>{' '}
                          <span className="table-muted">{s.unidade}</span>
                        </td>
                        <td className="num">
                          {s.controla_lote ? (s.lotes_count ?? 0) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="num">{formatCurrency(s.custo_medio)}</td>
                        <td className="num">{formatValorPosicao(s.qtde, s.custo_medio)}</td>
                        <td>
                          {s.controla_lote ? (
                            validadeResumo(s.validade_status, s.proxima_validade)
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : tab === 'lotes' ? (
            lotesSort.sorted.length === 0 ? (
              <div className="empty-state">
                {q || validadeFiltro
                  ? 'Nenhum lote com este filtro.'
                  : 'Nenhum lote. Substratos e tintas passam a controlar lote na entrada e na virada.'}
              </div>
            ) : (
              <table className="data-table estoque-dense-table">
                <thead>
                  <tr>
                    <SortableTh
                      column="produto"
                      sorts={lotesSort.sorts} sortKey={lotesSort.sortKey}
                      sortDir={lotesSort.sortDir}
                      onSort={lotesSort.requestSort}
                    >
                      Produto
                    </SortableTh>
                    <SortableTh
                      column="codigo"
                      sorts={lotesSort.sorts} sortKey={lotesSort.sortKey}
                      sortDir={lotesSort.sortDir}
                      onSort={lotesSort.requestSort}
                    >
                      Lote
                    </SortableTh>
                    <SortableTh
                      column="dimensao"
                      sorts={lotesSort.sorts} sortKey={lotesSort.sortKey}
                      sortDir={lotesSort.sortDir}
                      onSort={lotesSort.requestSort}
                    >
                      Dimensão
                    </SortableTh>
                    <SortableTh
                      column="entrada"
                      sorts={lotesSort.sorts} sortKey={lotesSort.sortKey}
                      sortDir={lotesSort.sortDir}
                      onSort={lotesSort.requestSort}
                    >
                      Entrada
                    </SortableTh>
                    <SortableTh
                      column="validade"
                      sorts={lotesSort.sorts} sortKey={lotesSort.sortKey}
                      sortDir={lotesSort.sortDir}
                      onSort={lotesSort.requestSort}
                    >
                      Vencimento
                    </SortableTh>
                    <SortableTh
                      column="qtde"
                      sorts={lotesSort.sorts} sortKey={lotesSort.sortKey}
                      sortDir={lotesSort.sortDir}
                      onSort={lotesSort.requestSort}
                      className="num"
                    >
                      Qtde
                    </SortableTh>
                    <SortableTh
                      column="status"
                      sorts={lotesSort.sorts} sortKey={lotesSort.sortKey}
                      sortDir={lotesSort.sortDir}
                      onSort={lotesSort.requestSort}
                    >
                      Situação
                    </SortableTh>
                    <th>Local</th>
                    <th className="acoes" />
                  </tr>
                </thead>
                <tbody>
                  {lotesSort.sorted.map((l) => {
                    const go = () => navigate(`/estoque/extrato/${l.produto_id}`);
                    return (
                      <tr
                        key={l.id}
                        className="clickable"
                        tabIndex={0}
                        role="link"
                        onClick={go}
                        onKeyDown={(e) => activateRow(e, go)}
                      >
                        <td>
                          <strong>{l.produto?.codigo}</strong>
                        </td>
                        <td>{l.codigo}</td>
                        <td className="dimensao">
                          {formatVolumeDimensao(l.largura_mm ?? null, l.comprimento_m ?? null)}
                        </td>
                        <td>{l.data_entrada ? formatDate(l.data_entrada) : '—'}</td>
                        <td>{l.data_validade ? formatDate(l.data_validade) : '—'}</td>
                        <td className="num">
                          {formatQtyCompact(l.qtde)}{' '}
                          <span className="table-muted">{l.unidade}</span>
                        </td>
                        <td>
                          {l.status === 'VENCIDO' || l.status === 'A_VENCER' ? (
                            <StatusPill status={l.status_label || validadeStatusLabel(l.status)} />
                          ) : (
                            <span className="table-muted">
                              {l.status_label || validadeStatusLabel(l.status)}
                            </span>
                          )}
                        </td>
                        <td>{l.endereco?.codigo ?? <span className="muted">—</span>}</td>
                        <td className="acoes" onClick={(e) => e.stopPropagation()}>
                          <div className="table-actions">
                            <Link
                              to={`/estoque/lotes/${l.id}/etiqueta`}
                              className="btn-icon"
                              title="Etiqueta do volume"
                              aria-label={`Etiqueta do volume ${l.codigo}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconTag />
                            </Link>
                            {!l.endereco_id ? (
                              <Link
                                to="/estoque/guardar"
                                className="btn-icon"
                                title="Guardar no local"
                                aria-label={`Guardar volume ${l.codigo} no local`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconMapPin />
                              </Link>
                            ) : null}
                            {hasPermission('producao.ler') || hasPermission('estoque.ler') ? (
                              <Link
                                to={`/rastreio?q=${encodeURIComponent(l.codigo)}`}
                                className="btn-icon"
                                title="Rastreio do volume"
                                aria-label={`Rastreio do volume ${l.codigo}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconRastreio />
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : movsSort.sorted.length === 0 ? (
            <div className="empty-state">
              {q ? 'Nenhum movimento com este filtro.' : 'Nenhum movimento de estoque.'}
            </div>
          ) : (
            <table className="data-table estoque-dense-table">
              <thead>
                <tr>
                  <SortableTh
                    column="codigo"
                    sorts={movsSort.sorts} sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    MOV
                  </SortableTh>
                  <SortableTh
                    column="tipo"
                    sorts={movsSort.sorts} sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    Tipo
                  </SortableTh>
                  <SortableTh
                    column="documento"
                    sorts={movsSort.sorts} sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    Documento
                  </SortableTh>
                  <SortableTh
                    column="sku"
                    sorts={movsSort.sorts} sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    Produto
                  </SortableTh>
                  <SortableTh
                    column="conferido"
                    sorts={movsSort.sorts} sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    Conferido
                  </SortableTh>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movsSort.sorted.map((m) => {
                  const first = m.itens?.[0];
                  const extra = (m.itens?.length ?? 0) > 1 ? (m.itens!.length - 1) : 0;
                  const qk = first ? qtdeKardex(m.tipo, first.qtde, first.unidade) : null;
                  const go = first
                    ? () => navigate(`/estoque/extrato/${first.produto_id}`)
                    : undefined;
                  return (
                    <tr
                      key={m.id}
                      className={go ? 'clickable' : undefined}
                      tabIndex={go ? 0 : undefined}
                      role={go ? 'link' : undefined}
                      onClick={go}
                      onKeyDown={go ? (e) => activateRow(e, go) : undefined}
                    >
                      <td>
                        <strong>{m.codigo}</strong>
                      </td>
                      <td>{movTipoLabel(m.tipo)}</td>
                      <td
                        onClick={m.ordem_compra ? (e) => e.stopPropagation() : undefined}
                        onKeyDown={m.ordem_compra ? (e) => e.stopPropagation() : undefined}
                      >
                        {m.ordem_compra ? (
                          <Link to={`/compras/ordens/${m.ordem_compra.id}`}>
                            {movimentoDocumento(m)}
                          </Link>
                        ) : (
                          movimentoDocumento(m)
                        )}
                        {m.nfe_entrada?.xml_armazenado ? (
                          <div className="muted">espelho fiscal</div>
                        ) : null}
                        {m.fornecedor ? (
                          <div className="muted">
                            {m.fornecedor.nome_fantasia || m.fornecedor.razao_social}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {first ? (
                          <>
                            <strong>{first.produto?.codigo ?? '—'}</strong>
                            {qk ? (
                              <div className={`muted ${qk.className}`}>{qk.text}</div>
                            ) : null}
                            {extra > 0 ? (
                              <div className="muted">+{extra} item(ns)</div>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{formatDate(m.conferido_em)}</td>
                      <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        {m.tipo === 'ENTRADA_COMPRA' ? (
                          <Link
                            to={`/estoque/movimentos/${m.id}/ficha-entrada`}
                            className="linkish linkish--meta"
                          >
                            Ficha QR
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {tab === 'saldos' && saldoSelecionado ? (
        <div className="card estoque-saldo-ficha" style={{ marginTop: '1rem' }}>
          <div className="card-body">
            <div className="form-section" style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>
                {saldoSelecionado.produto?.codigo}
                <span className="muted" style={{ marginLeft: '0.5rem', fontWeight: 400 }}>
                  posição física
                </span>
              </h3>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {(saldoSelecionado.produto?.descricao_comercial ||
                  saldoSelecionado.produto?.descricao_fiscal ||
                  '')}
              </p>
            </div>

            <div className="detail-meta estoque-ficha-meta">
              <div>
                <span>Saldo oficial</span>
                <strong>
                  {formatQty(saldoSelecionado.qtde)} {saldoSelecionado.unidade}
                </strong>
              </div>
              <div>
                <span>Volumes</span>
                <strong>
                  {saldoSelecionado.controla_lote
                    ? (saldoSelecionado.lotes_count ?? 0)
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Valor</span>
                <strong>
                  {formatValorPosicao(saldoSelecionado.qtde, saldoSelecionado.custo_medio)}
                </strong>
              </div>
            </div>

            {saldoSelecionado.controla_lote &&
            (saldoSelecionado.volumes_por_qtde ?? []).length > 0 ? (
              <div className="table-wrap">
                <table className="data-table estoque-vol-consolidado-table">
                  <thead>
                    <tr>
                      <th className="num">Qtde / volume</th>
                      <th>Dimensão</th>
                      <th className="num">Volumes</th>
                      <th className="num">Subtotal</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(saldoSelecionado.volumes_por_qtde ?? []).map((faixa) => (
                      <tr
                        key={`${saldoSelecionado.id}-${faixa.qtde}-${faixa.largura_mm ?? ''}-${faixa.comprimento_m ?? ''}`}
                      >
                        <td className="num">
                          {formatQtyCompact(faixa.qtde)}{' '}
                          <span className="table-muted">{faixa.unidade}</span>
                        </td>
                        <td className="dimensao">
                          {formatVolumeDimensao(
                            faixa.largura_mm ?? null,
                            faixa.comprimento_m ?? null,
                          )}
                        </td>
                        <td className="num">{faixa.volumes}</td>
                        <td className="num">
                          {subtotalFaixa(faixa.qtde, faixa.volumes)}{' '}
                          <span className="table-muted">{faixa.unidade}</span>
                        </td>
                        <td className="acoes">
                          <button
                            type="button"
                            className="linkish linkish--meta"
                            onClick={() =>
                              abrirVolumesPorQtde(
                                saldoSelecionado.produto_id,
                                faixa.qtde,
                                saldoSelecionado.produto?.codigo,
                                {
                                  largura_mm: faixa.largura_mm,
                                  comprimento_m: faixa.comprimento_m,
                                },
                              )
                            }
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : saldoSelecionado.controla_lote ? (
              <p className="muted" style={{ margin: 0 }}>
                Nenhum volume com saldo neste SKU.
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Este SKU não controla volume/lote — só o saldo oficial.
              </p>
            )}

            <div className="estoque-ficha-actions">
              {saldoSelecionado.controla_lote ? (
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    abrirVolumesDoSku(
                      saldoSelecionado.produto_id,
                      saldoSelecionado.produto?.codigo,
                    )
                  }
                >
                  Lista de volumes
                </button>
              ) : null}
              <button
                type="button"
                className="linkish"
                onClick={() => navigate(`/estoque/extrato/${saldoSelecionado.produto_id}`)}
              >
                Extrato
              </button>
              {hasPermission('produto.ler') ? (
                <Link to={`/produtos/${saldoSelecionado.produto_id}`} className="linkish">
                  Cadastro
                </Link>
              ) : null}
              <button
                type="button"
                className="linkish linkish--meta"
                onClick={() => setSaldoSelecionadoId(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : tab === 'saldos' && !loading && saldosSort.sorted.length > 0 ? (
        <p className="muted estoque-hint-select">
          Selecione um produto na grade para ver o consolidado de volumes.
        </p>
      ) : null}
    </div>
  );
}
