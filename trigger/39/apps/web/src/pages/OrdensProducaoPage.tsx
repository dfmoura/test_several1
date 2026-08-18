import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type OrdemProducao } from '../lib/api';
import { formatDate, formatDecimalBr } from '../lib/format';
import { opStatusLabel } from '../lib/producaoUi';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (o: OrdemProducao) => o.codigo,
  pedido: (o: OrdemProducao) => o.pedido?.codigo,
  item: (o: OrdemProducao) => o.pedido_item?.descricao,
  qtde: (o: OrdemProducao) => Number(o.qtde_planejada),
  status: (o: OrdemProducao) => o.status,
  criada: (o: OrdemProducao) => o.created_at,
};

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

export function OrdensProducaoPage() {
  const navigate = useNavigate();
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(ops, SORT);

  const load = async (search?: string, st?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: OrdemProducao[] }>(
        `/ordens-producao${qs ? `?${qs}` : ''}`,
      );
      setOps(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar ordens de produção.');
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

      {erro ? <p className="form-error">{erro}</p> : null}

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
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary">
                Filtrar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        {!loading && ops.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">{ops.length} ordem(ns) nesta EMP</span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              {q || status
                ? 'Nenhuma OP encontrada com estes filtros.'
                : 'Nenhuma OP. Abra a partir de um pedido liberado.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    OP
                  </SortableTh>
                  <SortableTh column="pedido" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Pedido
                  </SortableTh>
                  <SortableTh column="item" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Item
                  </SortableTh>
                  <SortableTh column="qtde" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Planejada
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="criada" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Criada
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((o) => {
                  const go = () => navigate(`/ordens-producao/${o.id}`);
                  return (
                    <tr
                      key={o.id}
                      className="clickable"
                      tabIndex={0}
                      role="link"
                      onClick={go}
                      onKeyDown={(e) => activateRow(e, go)}
                    >
                      <td>
                        <strong>{o.codigo}</strong>
                      </td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {o.pedido ? (
                          <Link to={`/pedidos/${o.pedido.id}`}>{o.pedido.codigo}</Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{o.pedido_item?.descricao ?? '—'}</td>
                      <td>{formatDecimalBr(Number(o.qtde_planejada), 0)}</td>
                      <td>
                        <StatusPill status={opStatusLabel(o.status)} />
                      </td>
                      <td>{formatDate(o.created_at)}</td>
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
