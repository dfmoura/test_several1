import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type OrdemCompra } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ocStatusLabel } from '../lib/comprasUi';
import { formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (o: OrdemCompra) => o.codigo,
  fornecedor: (o: OrdemCompra) => o.fornecedor?.razao_social,
  status: (o: OrdemCompra) => o.status,
  total: (o: OrdemCompra) => Number(o.valor_total),
  previsao: (o: OrdemCompra) => o.previsao_entrega,
};

export function ComprasOrdensPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(ordens, SORT);

  const load = async (search?: string, st?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: OrdemCompra[] }>(
        `/ordens-compra${qs ? `?${qs}` : ''}`,
      );
      setOrdens(res.data);
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
        title="Ordens de compra"
        description="Emita a OC, receba com NF × conferência e o material entra no estoque. Sem OC não entra saldo."
        actions={
          hasPermission('compras.escrever') ? (
            <Link to="/compras/ordens/nova" className="btn btn-primary">
              Nova OC
            </Link>
          ) : undefined
        }
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código, fornecedor…"
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="ABERTA">Aberta</option>
                <option value="PARCIAL">Parcial</option>
                <option value="RECEBIDA">Recebida</option>
                <option value="CANCELADA">Cancelada</option>
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
            <div className="empty-state">Nenhuma ordem de compra encontrada.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh column="fornecedor" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Fornecedor
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="total" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Total
                  </SortableTh>
                  <SortableTh column="previsao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Previsão
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable"
                    onClick={() => navigate(`/compras/ordens/${o.id}`)}
                  >
                    <td>
                      <strong>{o.codigo}</strong>
                      {o.urgente && (
                        <span className="muted" style={{ marginLeft: '0.5rem' }}>
                          urgente
                        </span>
                      )}
                      {o.origem === 'DIRETA' && (
                        <span className="muted" style={{ marginLeft: '0.35rem' }}>
                          · direta
                        </span>
                      )}
                    </td>
                    <td>{o.fornecedor?.nome_fantasia || o.fornecedor?.razao_social || '—'}</td>
                    <td>
                      <StatusPill status={ocStatusLabel(o.status)} />
                    </td>
                    <td>{formatCurrency(o.valor_total)}</td>
                    <td>{formatDate(o.previsao_entrega)}</td>
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
