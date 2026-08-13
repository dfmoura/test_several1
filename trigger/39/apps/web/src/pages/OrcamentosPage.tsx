import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  facaDesenhoFromSnapshot,
  OrcamentoFacaDesenho,
} from '../components/OrcamentoFacaDesenho';
import { IconEye, IconPencil } from '../components/NavIcons';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Orcamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDateTime } from '../lib/format';
import { isOrcEditavel, statusOrcPill } from '../lib/orcamentoForm';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (o: Orcamento) => o.codigo,
  parceiro: (o: Orcamento) => o.cliente_nome,
  status: (o: Orcamento) => o.status,
  versao: (o: Orcamento) => o.versao,
  matriz: (o: Orcamento) =>
    o.cobra_matriz && o.valor_matriz != null ? Number(o.valor_matriz) : null,
  faixa: (o: Orcamento) => {
    const primeiro = o.result_snapshot?.faixas?.[0];
    return primeiro?.valor_total != null ? Number(primeiro.valor_total) : null;
  },
  atualizado: (o: Orcamento) => o.updated_at,
};

export function OrcamentosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canWrite = hasPermission('orcamento.escrever');
  const [lista, setLista] = useState<Orcamento[]>([]);
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
        description="Propostas comerciais — preparar, enviar link de aprovação e acompanhar o cliente."
        actions={
          <div className="btn-row">
            <Link to="/orcamentos/como-calcula" className="btn btn-secondary">
              Como calcula
            </Link>
            {canWrite ? (
              <Link to="/orcamentos/novo" className="btn btn-primary">
                Novo orçamento
              </Link>
            ) : null}
          </div>
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
                <option value="">Todos</option>
                <option value="CALCULADO">Em preparação</option>
                <option value="ENVIADO">Enviado p/ aprovação</option>
                <option value="VISUALIZADO">Visualizado</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REPROVADO">Rejeitado</option>
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
              <table className="data-table orcamentos-table">
                <thead>
                  <tr>
                    <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Código
                    </SortableTh>
                    <th>Faca</th>
                    <SortableTh column="parceiro" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Parceiro
                    </SortableTh>
                    <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Status
                    </SortableTh>
                    <SortableTh
                      column="versao"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      label="Versão"
                      className="num"
                    >
                      Ver.
                    </SortableTh>
                    <SortableTh
                      column="matriz"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      className="num"
                    >
                      Matriz
                    </SortableTh>
                    <SortableTh
                      column="faixa"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      label="Primeira faixa"
                      className="num"
                    >
                      1ª faixa
                    </SortableTh>
                    <SortableTh column="atualizado" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Atualizado
                    </SortableTh>
                    <th className="acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((o) => {
                    const faixas = o.result_snapshot?.faixas ?? [];
                    const primeiro = faixas[0];
                    const editavel = isOrcEditavel(o.status) && o.editavel;
                    const faca = facaDesenhoFromSnapshot(o.input_snapshot);
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
                        <td className="codigo">
                          <strong>{o.codigo}</strong>
                        </td>
                        <td className="faca">
                          {faca ? (
                            <OrcamentoFacaDesenho {...faca} variant="compact" />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="parceiro" title={o.cliente_nome}>
                          {o.cliente_nome}
                        </td>
                        <td className="status">
                          <StatusPill status={statusOrcPill(o.status, o.financeiro_status)} />
                        </td>
                        <td className="num">v{o.versao}</td>
                        <td className="num">
                          {o.cobra_matriz ? formatCurrency(o.valor_matriz) : '—'}
                        </td>
                        <td className="num">
                          {primeiro ? formatCurrency(primeiro.valor_total) : '—'}
                        </td>
                        <td>{formatDateTime(o.updated_at)}</td>
                        <td
                          className="acoes"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div className="table-actions">
                            <Link
                              to={`/orcamentos/${o.id}`}
                              className="btn-icon"
                              title="Ver orçamento"
                              aria-label={`Ver orçamento ${o.codigo}`}
                            >
                              <IconEye />
                            </Link>
                            {canWrite && editavel ? (
                              <Link
                                to={`/orcamentos/${o.id}/editar`}
                                className="btn-icon"
                                title="Editar orçamento"
                                aria-label={`Editar orçamento ${o.codigo}`}
                              >
                                <IconPencil />
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
