import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type BemPatrimonial } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDate } from '../lib/format';
import { bemCategoriaLabel, bemStatusLabel } from '../lib/patrimonio';
import { useTableSort } from '../lib/useTableSort';

const CATEGORIAS = [
  'MAQUINA_GRAFICA',
  'EQUIPAMENTO',
  'INFORMATICA',
  'VEICULO',
  'MOVEL',
  'SOFTWARE',
  'OUTRO',
] as const;

const STATUSES = ['ATIVO', 'EM_MANUTENCAO', 'CEDIDO', 'BAIXADO', 'VENDIDO'] as const;

const SORT = {
  codigo: (b: BemPatrimonial) => b.codigo,
  descricao: (b: BemPatrimonial) => b.descricao,
  categoria: (b: BemPatrimonial) => bemCategoriaLabel(b.categoria),
  local: (b: BemPatrimonial) => b.departamento?.nome ?? b.local,
  aquisicao: (b: BemPatrimonial) => b.adquirido_em,
  valor: (b: BemPatrimonial) =>
    b.valor_aquisicao != null ? Number(b.valor_aquisicao) : null,
  grupo: (b: BemPatrimonial) => b.grupo_hora_maquina?.nome,
  status: (b: BemPatrimonial) => b.status,
};

export function PatrimonioPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [bens, setBens] = useState<BemPatrimonial[]>([]);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(bens, SORT);

  const load = async (search?: string, cat?: string, st?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (cat) params.set('categoria', cat);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: BemPatrimonial[] }>(`/bens${qs ? `?${qs}` : ''}`);
      setBens(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(q, categoria, status);
  };

  return (
    <>
      <PageHeader
        title="Patrimônio"
        description="Bens físicos (BEM-) integrados ao ORC via grupo hora-máquina e ao parceiro fornecedor. Tarifas G10 continuam no Catálogo ORC."
        actions={
          hasPermission('patrimonio.escrever') ? (
            <Link to="/patrimonio/novo" className="btn btn-primary">
              Novo bem
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
                placeholder="Código, descrição, marca, série, departamento"
              />
            </div>
            <div className="form-group" style={{ minWidth: 180 }}>
              <label>Categoria</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {bemCategoriaLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {bemStatusLabel(s)}
                  </option>
                ))}
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
          ) : bens.length === 0 ? (
            <div className="empty-state">Nenhum bem patrimonial encontrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh column="descricao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Descrição
                  </SortableTh>
                  <SortableTh column="categoria" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Categoria
                  </SortableTh>
                  <SortableTh column="local" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Departamento
                  </SortableTh>
                  <SortableTh column="aquisicao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Aquisição
                  </SortableTh>
                  <SortableTh column="valor" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Valor
                  </SortableTh>
                  <SortableTh
                    column="grupo"
                    sorts={sorts} sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    label="Grupo ORC"
                  >
                    Grupo ORC
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b) => (
                  <tr
                    key={b.id}
                    className="clickable"
                    onClick={() => navigate(`/patrimonio/${b.id}`)}
                  >
                    <td>{b.codigo}</td>
                    <td>
                      <div>{b.descricao}</div>
                      {(b.marca || b.modelo) && (
                        <small style={{ opacity: 0.7 }}>
                          {[b.marca, b.modelo].filter(Boolean).join(' · ')}
                        </small>
                      )}
                    </td>
                    <td>{bemCategoriaLabel(b.categoria)}</td>
                    <td>{b.departamento?.nome ?? b.local ?? '—'}</td>
                    <td>{formatDate(b.adquirido_em)}</td>
                    <td>{formatCurrency(b.valor_aquisicao)}</td>
                    <td>{b.grupo_hora_maquina?.nome ?? '—'}</td>
                    <td>
                      <StatusPill status={b.status} />
                    </td>
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
