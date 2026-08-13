import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type OrdemProducao } from '../lib/api';
import { formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (o: OrdemProducao) => o.codigo,
  pedido: (o: OrdemProducao) => o.pedido?.codigo,
  status: (o: OrdemProducao) => o.status,
};

export function OrdensProducaoPage() {
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(ops, SORT);

  const load = async (search?: string, st?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: OrdemProducao[] }>(
        `/ordens-producao${qs ? `?${qs}` : ''}`,
      );
      setOps(res.data);
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
        title="Ordens de produção"
        description="Saída de MP, apontamento de sobra/perda e entrada de produto acabado — tudo no mesmo estoque."
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="OP, PED…" />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="ABERTA">Aberta</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="CONCLUIDA">Concluída</option>
                <option value="CANCELADA">Cancelada</option>
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
                  OP
                </SortableTh>
                <SortableTh column="pedido" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Pedido
                </SortableTh>
                <th>Item</th>
                <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                  Status
                </SortableTh>
                <th>Criada</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="loading">
                    Carregando…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Nenhuma OP. Abra a partir de um pedido liberado.
                  </td>
                </tr>
              ) : (
                sorted.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/ordens-producao/${o.id}`}>{o.codigo}</Link>
                    </td>
                    <td>
                      {o.pedido ? (
                        <Link to={`/pedidos/${o.pedido.id}`}>{o.pedido.codigo}</Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{o.pedido_item?.descricao ?? '—'}</td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                    <td>{formatDate(o.created_at)}</td>
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
