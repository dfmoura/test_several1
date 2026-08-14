import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Pedido } from '../lib/api';
import { formatDate } from '../lib/format';
import { pedStatusLabel } from '../lib/producaoUi';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (p: Pedido) => p.codigo,
  parceiro: (p: Pedido) => p.parceiro?.razao_social,
  item: (p: Pedido) => p.itens[0]?.descricao,
  orcamento: (p: Pedido) => p.orcamento?.codigo,
  status: (p: Pedido) => p.status,
  prazo: (p: Pedido) => p.prazo_entrega_dias,
  criado: (p: Pedido) => p.created_at,
};

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

export function PedidosPage() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(pedidos, SORT);

  const load = async (search?: string, st?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: Pedido[] }>(`/pedidos${qs ? `?${qs}` : ''}`);
      setPedidos(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q, status);
  };

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Nascem do orçamento liberado (crédito ou adiantamento baixado). Produção abre OP/OS; pedido produzido segue para faturamento."
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="PED, ORC, cliente…"
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="LIBERADO">Liberado</option>
                <option value="EM_PRODUCAO">Em produção</option>
                <option value="PRODUZIDO">Produzido</option>
                <option value="FATURADO">Faturado</option>
                <option value="CANCELADO">Cancelado</option>
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
        {!loading && pedidos.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">{pedidos.length} pedido(s) nesta EMP</span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              {q || status
                ? 'Nenhum pedido encontrado com estes filtros.'
                : 'Nenhum pedido. Aprove um orçamento com liberação financeira.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh
                    column="parceiro"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Cliente
                  </SortableTh>
                  <SortableTh column="item" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Item
                  </SortableTh>
                  <SortableTh
                    column="orcamento"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    ORC
                  </SortableTh>
                  <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="prazo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Prazo
                  </SortableTh>
                  <SortableTh column="criado" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Criado
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const go = () => navigate(`/pedidos/${p.id}`);
                  return (
                    <tr
                      key={p.id}
                      className="clickable"
                      tabIndex={0}
                      role="link"
                      onClick={go}
                      onKeyDown={(e) => activateRow(e, go)}
                    >
                      <td>
                        <strong>{p.codigo}</strong>
                      </td>
                      <td>{p.parceiro?.razao_social ?? '—'}</td>
                      <td>{p.itens[0]?.descricao ?? '—'}</td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {p.orcamento?.id ? (
                          <Link to={`/orcamentos/${p.orcamento.id}`}>{p.orcamento.codigo}</Link>
                        ) : (
                          (p.orcamento?.codigo ?? '—')
                        )}
                      </td>
                      <td>
                        <StatusPill status={pedStatusLabel(p.status)} />
                      </td>
                      <td>{p.prazo_entrega_dias != null ? `${p.prazo_entrega_dias} d.úteis` : '—'}</td>
                      <td>{formatDate(p.created_at)}</td>
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
