import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Relatorio } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDENTE: 'Pendente',
    PROCESSANDO: 'Processando',
    CONCLUIDO: 'Concluído',
    ERRO: 'Erro',
    CANCELADO: 'Cancelado',
  };
  return map[status] ?? status;
}

const SORT = {
  codigo: (r: Relatorio) => r.codigo,
  titulo: (r: Relatorio) => r.titulo,
  orientacao: (r: Relatorio) => r.orientacao,
  status: (r: Relatorio) => r.status,
  criado: (r: Relatorio) => r.created_at,
};

export function RelatoriosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canWrite = hasPermission('relatorio.escrever');
  const [lista, setLista] = useState<Relatorio[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(lista, SORT);

  const load = async (search?: string, statusFilter?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();
      const res = await api.get<{ data: Relatorio[] }>(`/relatorios${qs ? `?${qs}` : ''}`);
      setLista(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Peça em linguagem natural; a IA monta o programa seguro e gera o PDF (retrato ou paisagem)."
        actions={
          canWrite ? (
            <Link to="/relatorios/novo" className="btn btn-primary">
              Novo relatório
            </Link>
          ) : undefined
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(q, status);
            }}
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
          >
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código, título ou prompt"
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PROCESSANDO">Processando</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="ERRO">Erro</option>
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
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <p className="loading" style={{ padding: '1.5rem' }}>
              Carregando…
            </p>
          ) : lista.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
              Nenhum relatório neste contexto.
              {canWrite ? (
                <>
                  {' '}
                  <Link to="/relatorios/novo">Criar o primeiro</Link>.
                </>
              ) : null}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Código
                    </SortableTh>
                    <SortableTh column="titulo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Título
                    </SortableTh>
                    <SortableTh column="orientacao" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Orientação
                    </SortableTh>
                    <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Status
                    </SortableTh>
                    <SortableTh column="criado" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Criado
                    </SortableTh>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/relatorios/${r.id}`}>{r.codigo}</Link>
                      </td>
                      <td>{r.titulo || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td>{r.orientacao === 'paisagem' ? 'Paisagem' : 'Retrato'}</td>
                      <td>
                        <StatusPill status={statusLabel(r.status)} />
                      </td>
                      <td>{formatDateTime(r.created_at)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/relatorios/${r.id}`)}
                        >
                          Ver
                        </button>
                        {r.downloadable ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ marginLeft: 6 }}
                            onClick={() =>
                              void api.download(`/relatorios/${r.id}/download`, `${r.codigo}.pdf`)
                            }
                          >
                            PDF
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
