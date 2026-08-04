import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type Orcamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDateTime } from '../lib/format';
import { isOrcEditavel, statusOrcLabel } from '../lib/orcamentoForm';

export function OrcamentosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canWrite = hasPermission('orcamento.escrever');
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = async (search?: string, statusFilter?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();
      const res = await api.get<{ data: Orcamento[] }>(`/orcamentos${qs ? `?${qs}` : ''}`);
      setLista(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar orçamentos');
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
        title="Orçamentos"
        description="Pré-fluxo comercial — calcular, salvar e revisar rascunhos (M02). Sem envio nem PED."
        actions={
          canWrite ? (
            <Link to="/orcamentos/novo" className="btn btn-primary">
              Novo orçamento
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
                placeholder="Código ou cliente"
              />
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todos (pré-envio)</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="CALCULADO">Calculado</option>
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
              Nenhum orçamento neste contexto.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Parceiro</th>
                    <th>Status</th>
                    <th>Ver.</th>
                    <th>Matriz</th>
                    <th>1ª faixa</th>
                    <th>Atualizado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((o) => {
                    const faixas = o.result_snapshot?.faixas ?? [];
                    const primeiro = faixas[0];
                    const editavel = isOrcEditavel(o.status) && o.editavel;
                    return (
                      <tr
                        key={o.id}
                        className="clickable"
                        tabIndex={0}
                        role="link"
                        onClick={() => navigate(`/orcamentos/${o.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/orcamentos/${o.id}`);
                          }
                        }}
                      >
                        <td>
                          <strong>{o.codigo}</strong>
                        </td>
                        <td>{o.cliente_nome}</td>
                        <td>
                          <StatusPill status={statusOrcLabel(o.status)} />
                        </td>
                        <td>v{o.versao}</td>
                        <td>
                          {o.cobra_matriz ? formatCurrency(o.valor_matriz) : '—'}
                        </td>
                        <td>{primeiro ? formatCurrency(primeiro.valor_total) : '—'}</td>
                        <td>{formatDateTime(o.updated_at)}</td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div className="btn-row">
                            <Link to={`/orcamentos/${o.id}`} className="btn btn-secondary btn-sm">
                              Ver
                            </Link>
                            {canWrite && editavel ? (
                              <Link
                                to={`/orcamentos/${o.id}/editar`}
                                className="btn btn-secondary btn-sm"
                              >
                                Editar
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
