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
  movTipoLabel,
  qtdeKardex,
  somaValorPosicao,
  textoBusca,
} from '../lib/estoqueUi';
import { familiaLabel, formatCurrency, formatDate, formatQty } from '../lib/format';
import { useAuth } from '../lib/auth';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';
import { useTableSort } from '../lib/useTableSort';

type TabId = 'saldos' | 'lotes' | 'movimentos';

const SORT_SALDO = {
  produto: (s: EstoqueSaldo) => s.produto?.codigo,
  familia: (s: EstoqueSaldo) => s.produto?.familia,
  qtde: (s: EstoqueSaldo) => Number(s.qtde),
  unidade: (s: EstoqueSaldo) => s.unidade,
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
  entrada: (l: EstoqueLote) => l.data_entrada,
  validade: (l: EstoqueLote) => l.data_validade,
  qtde: (l: EstoqueLote) => Number(l.qtde),
  status: (l: EstoqueLote) => l.status,
};

const TAB_HINT: Record<TabId, string> = {
  saldos: 'Saldo oficial em unidade interna. Custo médio móvel no SKU — lote só rastreia quantidade.',
  lotes: 'Volume = bobina (nLote). Etiqueta/QR e vão na ficha do lote. Consumo FEFO se lote omitido na baixa.',
  movimentos: 'Todo saldo nasce de um MOV. Compra, produção, sobra, PA e ajuste aprovado.',
};

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
      return coincideBusca(
        textoBusca(l.produto?.codigo, l.produto?.descricao_fiscal, l.codigo, l.status_label),
        q,
      );
    });
  }, [lotes, q, validadeFiltro]);

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
    setValidadeFiltro(status);
  };

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Saldo em unidade interna. Nada entra ou sai sem documento — compra (NF na OC), OP, sobra, PA ou ajuste aprovado."
        actions={
          <div className="btn-row">
            {hasPermission('produto.ler') ? (
              <Link to="/produtos" className="btn btn-secondary">
                Produtos
              </Link>
            ) : null}
            <Link to="/compras/reposicao" className="btn btn-secondary">
              A repor
            </Link>
            <Link to="/compras/ordens" className="btn btn-primary">
              Receber por OC / NF-e
            </Link>
          </div>
        }
      />

      <EstoqueModuleNav />

      <div className="card estoque-continuidade-card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <h3 className="orc-section-title" style={{ marginTop: 0 }}>
            Entrada e documentos
          </h3>
          <p className="muted" style={{ marginTop: 0 }}>
            A NF-e de entrada confere-se na <strong>ordem de compra</strong> (XML assist + humano
            confirma). O estoque registra o movimento e o espelho fiscal; saldo inicial/legado usa
            ajuste A03. Sem entrada sem OC.
          </p>
          <div className="btn-row">
            <Link to="/compras/ordens" className="btn btn-primary">
              Abrir ordens de compra
            </Link>
            <Link to="/estoque/ajustes" className="btn btn-secondary">
              Ajustes / virada
            </Link>
            {hasPermission('produto.ler') ? (
              <Link to="/produtos" className="btn btn-secondary">
                Cadastro de produtos
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {!loading && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="detail-meta">
              <div>
                <span>SKUs com saldo</span>
                <strong>{saldos.length}</strong>
              </div>
              <div>
                <span>Valor da posição</span>
                <strong>{somaValorPosicao(saldos)}</strong>
              </div>
              <div>
                <span>Lotes em aberto</span>
                <strong>{lotes.filter((l) => Number(l.qtde) > 0).length}</strong>
              </div>
              <div>
                <span>Movimentos</span>
                <strong>{movs.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {(alertas.vencidos > 0 || alertas.aVencer > 0) && (
        <div
          className={`alert ${alertas.vencidos > 0 ? 'alert-error' : 'alert-warning'}`}
          style={{ marginBottom: '1rem' }}
        >
          {alertas.vencidos > 0 && (
            <button
              type="button"
              className="linkish"
              onClick={() => abrirLotesCriticos('VENCIDO')}
            >
              {alertas.vencidos} lote(s) vencido(s) com saldo
            </button>
          )}
          {alertas.vencidos > 0 && alertas.aVencer > 0 ? <span> · </span> : null}
          {alertas.aVencer > 0 && (
            <button
              type="button"
              className="linkish"
              onClick={() => abrirLotesCriticos('A_VENCER')}
            >
              {alertas.aVencer} lote(s) a vencer em até 60 dias
            </button>
          )}
          <span className="muted"> — abra a aba Lotes para conferir.</span>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Visões da posição">
        {(
          [
            ['saldos', 'Por produto', saldosFiltrados.length],
            ['lotes', 'Lotes', lotesFiltrados.length],
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

      <div className="card" style={{ marginBottom: '1rem' }}>
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
              <table className="data-table">
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
                      column="unidade"
                      sorts={saldosSort.sorts} sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Unidade
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
                    const go = () => navigate(`/estoque/extrato/${s.produto_id}`);
                    return (
                      <tr
                        key={s.id}
                        className="clickable"
                        tabIndex={0}
                        role="link"
                        onClick={go}
                        onKeyDown={(e) => activateRow(e, go)}
                      >
                        <td>
                          <strong>{s.produto?.codigo}</strong>
                          <div className="muted">
                            {s.produto?.descricao_comercial || s.produto?.descricao_fiscal}
                          </div>
                        </td>
                        <td>
                          {s.produto?.familia ? (
                            <>
                              {s.produto.familia}
                              <div className="muted">{familiaLabel(s.produto.familia)}</div>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="num">{formatQty(s.qtde)}</td>
                        <td>{s.unidade}</td>
                        <td className="num">{formatCurrency(s.custo_medio)}</td>
                        <td className="num">{formatValorPosicao(s.qtde, s.custo_medio)}</td>
                        <td>
                          {s.controla_lote ? (
                            <>
                              <StatusPill status={validadeStatusLabel(s.validade_status)} />
                              <div className="muted">
                                {s.lotes_count ?? 0} lote(s)
                                {s.proxima_validade ? ` · ${formatDate(s.proxima_validade)}` : ''}
                              </div>
                            </>
                          ) : (
                            <span className="muted">Sem lote</span>
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
              <table className="data-table">
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
                          <div className="muted">{l.produto?.descricao_fiscal}</div>
                        </td>
                        <td>{l.codigo}</td>
                        <td>{l.data_entrada ? formatDate(l.data_entrada) : '—'}</td>
                        <td>{l.data_validade ? formatDate(l.data_validade) : '—'}</td>
                        <td className="num">
                          {formatQty(l.qtde)} {l.unidade}
                        </td>
                        <td>
                          <StatusPill status={l.status_label || validadeStatusLabel(l.status)} />
                        </td>
                        <td className="acoes" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/estoque/lotes/${l.id}/etiqueta`}
                            className="btn btn-secondary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Etiqueta
                          </Link>
                          {hasPermission('producao.ler') || hasPermission('estoque.ler') ? (
                            <Link
                              to={`/rastreio?q=${encodeURIComponent(l.codigo)}`}
                              className="btn btn-secondary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Rastreio
                            </Link>
                          ) : null}
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
            <table className="data-table">
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
