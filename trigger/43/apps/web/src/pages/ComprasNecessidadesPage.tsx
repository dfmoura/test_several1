import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type CompraNecessidade, type Produto } from '../lib/api';
import { useAuth } from '../lib/auth';
import { necStatusLabel } from '../lib/comprasUi';
import { formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (r: CompraNecessidade) => r.codigo,
  produto: (r: CompraNecessidade) => r.produto?.codigo,
  qtde: (r: CompraNecessidade) => Number(r.qtde),
  prioridade: (r: CompraNecessidade) => r.prioridade,
  status: (r: CompraNecessidade) => r.status,
  quando: (r: CompraNecessidade) => r.necessario_em,
};

export function ComprasNecessidadesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('compras.escrever');
  const [rows, setRows] = useState<CompraNecessidade[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtoId, setProdutoId] = useState('');
  const [qtde, setQtde] = useState('');
  const [motivo, setMotivo] = useState('');
  const [prioridade, setPrioridade] = useState('NORMAL');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, SORT);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: CompraNecessidade[] }>('/compra-necessidades');
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void api.get<{ data: Produto[] }>('/produtos').then((r) => setProdutos(r.data));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      const produto = produtos.find((p) => String(p.id) === produtoId);
      await api.post('/compra-necessidades', {
        produto_id: Number(produtoId),
        qtde,
        unidade: produto?.unidade_comercial || produto?.unidade_interna || 'UN',
        motivo: motivo || null,
        prioridade,
      });
      setProdutoId('');
      setQtde('');
      setMotivo('');
      setMsg('Necessidade registrada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao registrar.');
    }
  };

  return (
    <>
      <PageHeader
        title="Necessidades de compra"
        description="Demanda leve (NEC-): nasce do estoque mínimo, falta ou PCP — sem requisição burocrática."
        actions={
          <Link to="/compras/ordens" className="btn btn-secondary">
            Ordens de compra
          </Link>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {canWrite && (
        <form onSubmit={(e) => void submit(e)} style={{ marginBottom: '1rem' }}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Registrar necessidade</h3>
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Produto</label>
                    <select
                      required
                      value={produtoId}
                      onChange={(e) => setProdutoId(e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} — {p.descricao_comercial || p.descricao_fiscal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantidade</label>
                    <input
                      required
                      inputMode="decimal"
                      value={qtde}
                      onChange={(e) => setQtde(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Prioridade</label>
                    <select
                      value={prioridade}
                      onChange={(e) => setPrioridade(e.target.value)}
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENTE">Urgente</option>
                    </select>
                  </div>
                  <div className="form-group span-2">
                    <label>Motivo</label>
                    <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Registrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">Nenhuma necessidade registrada.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh column="produto" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Produto
                  </SortableTh>
                  <SortableTh column="qtde" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Qtde
                  </SortableTh>
                  <SortableTh
                    column="prioridade"
                    sorts={sorts} sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Prioridade
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="quando" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Quando
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td>{r.codigo}</td>
                    <td>
                      {r.produto?.codigo} —{' '}
                      {r.produto?.descricao_comercial || r.produto?.descricao_fiscal}
                    </td>
                    <td>
                      {r.qtde} {r.unidade}
                    </td>
                    <td>
                      {r.prioridade === 'URGENTE' ? (
                        <StatusPill status="Urgente" />
                      ) : (
                        <span className="muted">Normal</span>
                      )}
                    </td>
                    <td>
                      <StatusPill status={necStatusLabel(r.status)} />
                    </td>
                    <td>{formatDate(r.necessario_em)}</td>
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
