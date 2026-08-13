import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Pedido } from '../lib/api';
import { formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (p: Pedido) => p.codigo,
  parceiro: (p: Pedido) => p.parceiro?.razao_social,
  status: (p: Pedido) => p.status,
  orcamento: (p: Pedido) => p.orcamento?.codigo,
};

export function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(pedidos, SORT);

  const load = async (search?: string, st?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: Pedido[] }>(`/pedidos${qs ? `?${qs}` : ''}`);
      setPedidos(res.data);
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
        description="Nascem do orçamento liberado (crédito ou adiantamento baixado). Daqui a produção abre OP ou OS."
      />

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
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary">
                Filtrar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Código
                </SortableTh>
                <SortableTh column="parceiro" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Cliente
                </SortableTh>
                <SortableTh column="orcamento" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  ORC
                </SortableTh>
                <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Status
                </SortableTh>
                <th>Item</th>
                <th>Criado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="loading">
                    Carregando…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    Nenhum pedido. Aprove um orçamento com liberação financeira.
                  </td>
                </tr>
              ) : (
                sorted.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/pedidos/${p.id}`}>{p.codigo}</Link>
                    </td>
                    <td>{p.parceiro?.razao_social ?? '—'}</td>
                    <td>{p.orcamento?.codigo ?? '—'}</td>
                    <td>
                      <StatusPill status={p.status} />
                    </td>
                    <td>{p.itens[0]?.descricao ?? '—'}</td>
                    <td>{formatDate(p.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
