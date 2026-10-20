import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IconDuplicate, IconEye, IconPencil } from '../components/NavIcons';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, ApiError, type Orcamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime } from '../lib/format';
import {
  isOrcEditavel,
  ORC_LISTA_STATUSES,
  statusOrcPill,
  type OrcListaStatus,
} from '../lib/orcamentoForm';
import { tipoOperacaoFromSnap, tipoOperacaoLabel } from '../lib/operacoesSaida';
import { appendPeriodo, currentMonthRange, hasPeriodo } from '../lib/periodo';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (o: Orcamento) => o.codigo,
  parceiro: (o: Orcamento) => o.cliente_nome,
  contato: (o: Orcamento) => o.contato_cliente?.nome,
  status: (o: Orcamento) => o.status,
  atualizado: (o: Orcamento) => o.updated_at,
};

type StatusTab = '' | OrcListaStatus;

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: '', label: 'Todos' },
  ...ORC_LISTA_STATUSES.map((id) => ({ id, label: statusOrcPill(id) })),
];

function parseStatusTab(raw: string | null): StatusTab {
  if (!raw) return '';
  return (ORC_LISTA_STATUSES as readonly string[]).includes(raw) ? (raw as OrcListaStatus) : '';
}

function emptyMessage(status: StatusTab, q: string, de: string, ate: string): string {
  const qTrim = q.trim();
  if (status && !qTrim) {
    return `Nenhum orçamento com status ${statusOrcPill(status)}${hasPeriodo(de, ate) ? ' neste período' : ''}.`;
  }
  if (status || qTrim) {
    return 'Nenhum orçamento encontrado com estes filtros.';
  }
  if (hasPeriodo(de, ate)) {
    return 'Nenhum orçamento neste período.';
  }
  return 'Nenhum orçamento nesta empresa. O livro começa vazio.';
}

export function OrcamentosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPermission('orcamento.escrever');
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [q, setQ] = useState('');
  const mesAtual = currentMonthRange();
  const [de, setDe] = useState(mesAtual.de);
  const [ate, setAte] = useState(mesAtual.ate);
  const [status, setStatusState] = useState<StatusTab>(() => parseStatusTab(searchParams.get('status')));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [duplicandoId, setDuplicandoId] = useState<number | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(lista, SORT);

  const load = useCallback(async (search?: string, statusFilter?: string, deVal?: string, ateVal?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      const qTrim = search?.trim();
      if (qTrim) params.set('q', qTrim);
      if (statusFilter) params.set('status', statusFilter);
      appendPeriodo(params, deVal, ateVal);
      const qs = params.toString();
      const res = await api.get<{ data: Orcamento[] }>(`/orcamentos${qs ? `?${qs}` : ''}`);
      setLista(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(undefined, status || undefined, de, ate);
    // Carga inicial (aba vinda da URL). Trocas de aba/busca disparam load à parte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = (next: StatusTab) => {
    if (next === status) return;
    setStatusState(next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next) p.set('status', next);
        else p.delete('status');
        return p;
      },
      { replace: true },
    );
    void load(q, next || undefined, de, ate);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q, status || undefined, de, ate);
  };

  const duplicar = async (o: Orcamento) => {
    if (!canWrite || o.status !== 'APROVADO' || duplicandoId != null) return;
    setDuplicandoId(o.id);
    setErro(null);
    try {
      const res = await api.post<{ data: Orcamento & { copiado_de?: { codigo: string } } }>(
        `/orcamentos/${o.id}/duplicar`,
      );
      navigate(`/orcamentos/${res.data.id}/editar`, {
        state: { copiadoDe: res.data.copiado_de?.codigo ?? o.codigo },
      });
    } catch (e) {
      const first = e instanceof ApiError ? Object.values(e.details ?? {})[0]?.[0] : null;
      setErro(first || (e instanceof Error ? e.message : 'Falha ao duplicar orçamento'));
      setDuplicandoId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Propostas comerciais — preparar, enviar link de aprovação e acompanhar o cliente."
        actions={
          <div className="btn-row">
            {canWrite ? (
              <Link to="/orcamentos/novo" className="btn btn-primary">
                Novo orçamento
              </Link>
            ) : null}
            <Link to="/orcamentos/como-calcula" className="btn btn-secondary">
              Como calcula
            </Link>
          </div>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="tabs tabs-orcamentos" role="tablist" aria-label="Status do orçamento">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id || 'todos'}
            type="button"
            role="tab"
            className={`tab${status === t.id ? ' active' : ''}`}
            aria-selected={status === t.id}
            onClick={() => setStatus(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="orcamentos-busca">Buscar</label>
              <input
                id="orcamentos-busca"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código, cliente ou contato"
              />
            </div>
            <div className="form-group">
              <label htmlFor="orcamentos-de">De</label>
              <input id="orcamentos-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="orcamentos-ate">Até</label>
              <input id="orcamentos-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
            <div>
              <button type="submit" className="btn btn-secondary">
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        {!loading && lista.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">
              {lista.length} orçamento(s) nesta empresa
            </span>
          </div>
        ) : null}
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <p className="loading" style={{ padding: '1.5rem' }}>
              Carregando…
            </p>
          ) : lista.length === 0 ? (
            <div className="empty-state empty-state--cta">
              <p>{emptyMessage(status, q, de, ate)}</p>
              {canWrite && !status && !q.trim() ? (
                <Link to="/orcamentos/novo" className="btn btn-primary">
                  Novo orçamento
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table orcamentos-table">
                <thead>
                  <tr>
                    <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Código
                    </SortableTh>
                    <SortableTh column="parceiro" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Parceiro
                    </SortableTh>
                    <SortableTh column="contato" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Contato
                    </SortableTh>
                    <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Status
                    </SortableTh>
                    <SortableTh column="atualizado" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Atualizado
                    </SortableTh>
                    <th className="acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((o) => {
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
                        <td className="codigo">
                          <strong>{o.codigo}</strong>
                          <div className="muted" style={{ fontSize: '0.8em' }}>
                            {tipoOperacaoLabel(o.tipo_operacao ?? tipoOperacaoFromSnap(o.input_snapshot))}
                          </div>
                        </td>
                        <td className="parceiro" title={o.cliente_nome}>
                          {o.cliente_nome}
                          {o.vendedor ? (
                            <div className="muted" style={{ fontSize: '0.8em' }}>
                              {o.vendedor.codigo}
                            </div>
                          ) : null}
                        </td>
                        <td className="contato" title={o.contato_cliente?.nome ?? undefined}>
                          {o.contato_cliente?.nome ?? '—'}
                          {o.contato_cliente?.funcao ? (
                            <div className="muted" style={{ fontSize: '0.8em' }}>
                              {o.contato_cliente.funcao}
                            </div>
                          ) : null}
                        </td>
                        <td className="status">
                          <StatusPill status={statusOrcPill(o.status, o.financeiro_status)} />
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
                            {canWrite && o.status === 'APROVADO' ? (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Novo orçamento em preparação, com as mesmas características. O aprovado permanece."
                                aria-label={`Duplicar orçamento ${o.codigo}`}
                                disabled={duplicandoId === o.id}
                                onClick={() => void duplicar(o)}
                              >
                                <IconDuplicate />
                              </button>
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
