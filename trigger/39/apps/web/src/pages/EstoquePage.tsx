import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type EstoqueLote, type EstoqueMovimento, type EstoqueSaldo } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';
import { useTableSort } from '../lib/useTableSort';

const SORT_SALDO = {
  produto: (s: EstoqueSaldo) => s.produto?.codigo,
  qtde: (s: EstoqueSaldo) => Number(s.qtde),
  unidade: (s: EstoqueSaldo) => s.unidade,
  custo: (s: EstoqueSaldo) => Number(s.custo_medio),
  validade: (s: EstoqueSaldo) => s.proxima_validade || s.validade_status,
};

const SORT_MOV = {
  codigo: (m: EstoqueMovimento) => m.codigo,
  tipo: (m: EstoqueMovimento) => m.tipo,
  nf: (m: EstoqueMovimento) => m.nf_numero || m.nf_chave,
  oc: (m: EstoqueMovimento) => m.ordem_compra?.codigo,
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

export function EstoquePage() {
  const [saldos, setSaldos] = useState<EstoqueSaldo[]>([]);
  const [movs, setMovs] = useState<EstoqueMovimento[]>([]);
  const [lotes, setLotes] = useState<EstoqueLote[]>([]);
  const [tab, setTab] = useState<'saldos' | 'lotes' | 'movimentos'>('saldos');
  const [loading, setLoading] = useState(true);
  const saldosSort = useTableSort(saldos, SORT_SALDO);
  const movsSort = useTableSort(movs, SORT_MOV);
  const lotesSort = useTableSort(lotes, SORT_LOTE);

  const alertas = useMemo(() => {
    const vencidos = lotes.filter((l) => l.status === 'VENCIDO' && Number(l.qtde) > 0).length;
    const aVencer = lotes.filter((l) => l.status === 'A_VENCER' && Number(l.qtde) > 0).length;
    return { vencidos, aVencer };
  }, [lotes]);

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

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Saldo em unidade interna. SKUs com lote mostram entrada e vencimento — consumo FEFO. Sem lançamento manual de saldo."
        actions={
          <>
            <Link to="/estoque/inventarios" className="btn btn-secondary">
              Inventários
            </Link>
            <Link to="/estoque/ajustes" className="btn btn-secondary">
              Ajustes
            </Link>
            <Link to="/compras/reposicao" className="btn btn-secondary">
              A repor
            </Link>
            <Link to="/compras/ordens" className="btn btn-secondary">
              Ordens de compra
            </Link>
          </>
        }
      />

      {(alertas.vencidos > 0 || alertas.aVencer > 0) && (
        <div className={`alert ${alertas.vencidos > 0 ? 'alert-error' : 'alert-warning'}`} style={{ marginBottom: '1rem' }}>
          {alertas.vencidos > 0 && (
            <span>
              {alertas.vencidos} lote(s) vencido(s) com saldo.{' '}
            </span>
          )}
          {alertas.aVencer > 0 && <span>{alertas.aVencer} lote(s) a vencer em até 60 dias.</span>}
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`tab${tab === 'saldos' ? ' active' : ''}`}
              onClick={() => setTab('saldos')}
            >
              Saldos
            </button>
            <button
              type="button"
              className={`tab${tab === 'lotes' ? ' active' : ''}`}
              onClick={() => setTab('lotes')}
            >
              Lotes
            </button>
            <button
              type="button"
              className={`tab${tab === 'movimentos' ? ' active' : ''}`}
              onClick={() => setTab('movimentos')}
            >
              Movimentos
            </button>
          </div>
        </div>
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : tab === 'saldos' ? (
            saldosSort.sorted.length === 0 ? (
              <div className="empty-state">
                Sem saldo. Receba uma OC para gerar a primeira entrada.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTh
                      column="produto"
                      sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Produto
                    </SortableTh>
                    <SortableTh
                      column="qtde"
                      sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Saldo
                    </SortableTh>
                    <SortableTh
                      column="unidade"
                      sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Unidade
                    </SortableTh>
                    <SortableTh
                      column="custo"
                      sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Custo médio
                    </SortableTh>
                    <SortableTh
                      column="validade"
                      sortKey={saldosSort.sortKey}
                      sortDir={saldosSort.sortDir}
                      onSort={saldosSort.requestSort}
                    >
                      Validade
                    </SortableTh>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {saldosSort.sorted.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.produto?.codigo}</strong>
                        <div className="muted">
                          {s.produto?.descricao_comercial || s.produto?.descricao_fiscal}
                        </div>
                      </td>
                      <td>{s.qtde}</td>
                      <td>{s.unidade}</td>
                      <td>{formatCurrency(s.custo_medio)}</td>
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
                      <td>
                        <div className="table-actions">
                          <Link
                            to={`/estoque/extrato/${s.produto_id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            Extrato
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : tab === 'lotes' ? (
            lotesSort.sorted.length === 0 ? (
              <div className="empty-state">
                Nenhum lote. Substratos e tintas passam a controlar lote na entrada e na virada.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTh column="produto" sortKey={lotesSort.sortKey} sortDir={lotesSort.sortDir} onSort={lotesSort.requestSort}>
                      Produto
                    </SortableTh>
                    <SortableTh column="codigo" sortKey={lotesSort.sortKey} sortDir={lotesSort.sortDir} onSort={lotesSort.requestSort}>
                      Lote
                    </SortableTh>
                    <SortableTh column="entrada" sortKey={lotesSort.sortKey} sortDir={lotesSort.sortDir} onSort={lotesSort.requestSort}>
                      Entrada
                    </SortableTh>
                    <SortableTh column="validade" sortKey={lotesSort.sortKey} sortDir={lotesSort.sortDir} onSort={lotesSort.requestSort}>
                      Vencimento
                    </SortableTh>
                    <SortableTh column="qtde" sortKey={lotesSort.sortKey} sortDir={lotesSort.sortDir} onSort={lotesSort.requestSort}>
                      Qtde
                    </SortableTh>
                    <SortableTh column="status" sortKey={lotesSort.sortKey} sortDir={lotesSort.sortDir} onSort={lotesSort.requestSort}>
                      Situação
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {lotesSort.sorted.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.produto?.codigo}</strong>
                        <div className="muted">{l.produto?.descricao_fiscal}</div>
                      </td>
                      <td>{l.codigo}</td>
                      <td>{l.data_entrada ? formatDate(l.data_entrada) : '—'}</td>
                      <td>{l.data_validade ? formatDate(l.data_validade) : '—'}</td>
                      <td>
                        {l.qtde} {l.unidade}
                      </td>
                      <td>
                        <StatusPill status={l.status_label || validadeStatusLabel(l.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : movsSort.sorted.length === 0 ? (
            <div className="empty-state">Nenhum movimento de estoque.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh
                    column="codigo"
                    sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    Código
                  </SortableTh>
                  <SortableTh
                    column="tipo"
                    sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    Tipo
                  </SortableTh>
                  <SortableTh
                    column="nf"
                    sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    NF
                  </SortableTh>
                  <SortableTh
                    column="oc"
                    sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    OC
                  </SortableTh>
                  <SortableTh
                    column="conferido"
                    sortKey={movsSort.sortKey}
                    sortDir={movsSort.sortDir}
                    onSort={movsSort.requestSort}
                  >
                    Conferido
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {movsSort.sorted.map((m) => (
                  <tr key={m.id}>
                    <td>{m.codigo}</td>
                    <td>{m.tipo}</td>
                    <td>{m.nf_numero || m.nf_chave || '—'}</td>
                    <td>{m.ordem_compra?.codigo || '—'}</td>
                    <td>{formatDate(m.conferido_em)}</td>
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
