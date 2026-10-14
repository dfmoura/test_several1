import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { textoResumoModelosCliente } from '../lib/modeloDecisao';
import {
  isOrcEditavel,
  ORC_LISTA_STATUSES,
  statusOrcPill,
  type OrcListaStatus,
} from '../lib/orcamentoForm';
import { tipoOperacaoFromSnap, tipoOperacaoLabel } from '../lib/operacoesSaida';
import { totalPropostaFaixa } from '../lib/orcamentoFrete';
import { useTableSort } from '../lib/useTableSort';

function totalPrimeiraFaixa(o: Orcamento): number | null {
  const primeiro = o.result_snapshot?.faixas?.[0];
  if (!primeiro) return null;
  const facaNova = Boolean(o.input_snapshot?.faca_nova ?? o.result_snapshot?.faca_nova);
  const raw = o.result_snapshot?.valor_faca_nova ?? o.input_snapshot?.valor_faca_nova;
  const valorFaca = typeof raw === 'number' || typeof raw === 'string' ? raw : null;
  const valorArtes = Number(o.result_snapshot?.valor_artes) || 0;
  return totalPropostaFaixa(primeiro, facaNova, valorFaca, valorArtes);
}

const SORT = {
  codigo: (o: Orcamento) => o.codigo,
  parceiro: (o: Orcamento) => o.cliente_nome,
  status: (o: Orcamento) => o.status,
  versao: (o: Orcamento) => o.versao,
  matriz: (o: Orcamento) =>
    o.cobra_matriz && o.valor_matriz != null ? Number(o.valor_matriz) : null,
  faixa: (o: Orcamento) => totalPrimeiraFaixa(o),
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

function emptyMessage(status: StatusTab, q: string): string {
  const qTrim = q.trim();
  if (status && !qTrim) {
    return `Nenhum orçamento com status ${statusOrcPill(status)}.`;
  }
  if (status || qTrim) {
    return 'Nenhum orçamento encontrado com estes filtros.';
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
  const [status, setStatusState] = useState<StatusTab>(() => parseStatusTab(searchParams.get('status')));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(lista, SORT);

  const load = useCallback(async (search?: string, statusFilter?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      const qTrim = search?.trim();
      if (qTrim) params.set('q', qTrim);
      if (statusFilter) params.set('status', statusFilter);
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
    void load(undefined, status || undefined);
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
    void load(q, next || undefined);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q, status || undefined);
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
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="orcamentos-busca">Buscar</label>
              <input
                id="orcamentos-busca"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código ou cliente"
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
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
              <p>{emptyMessage(status, q)}</p>
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
                    <th>Faca</th>
                    <SortableTh column="parceiro" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Parceiro
                    </SortableTh>
                    <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Status
                    </SortableTh>
                    <th title="Decisão do cliente sobre os modelos">Modelos</th>
                    <SortableTh
                      column="versao"
                      sorts={sorts} sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      label="Versão"
                      className="num"
                    >
                      Ver.
                    </SortableTh>
                    <SortableTh
                      column="matriz"
                      sorts={sorts} sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      className="num"
                    >
                      Matriz
                    </SortableTh>
                    <SortableTh
                      column="faixa"
                      sorts={sorts} sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      label="Primeira faixa"
                      className="num"
                    >
                      1ª faixa
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
                    const faca = facaDesenhoFromSnapshot(o.input_snapshot);
                    const totalPrimeira = totalPrimeiraFaixa(o);
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
                        <td className="faca">
                          {faca ? (
                            <OrcamentoFacaDesenho {...faca} variant="compact" />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="parceiro" title={o.cliente_nome}>
                          {o.cliente_nome}
                          {o.vendedor ? (
                            <div className="muted" style={{ fontSize: '0.8em' }}>
                              {o.vendedor.codigo}
                            </div>
                          ) : null}
                        </td>
                        <td className="status">
                          <StatusPill status={statusOrcPill(o.status, o.financeiro_status)} />
                        </td>
                        <td className="orc-modelos-cliente-cell">
                          {textoResumoModelosCliente(o.modelos_cliente) ?? (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="num">v{o.versao}</td>
                        <td className="num">
                          {o.cobra_matriz ? formatCurrency(o.valor_matriz) : '—'}
                        </td>
                        <td className="num">
                          {totalPrimeira != null ? formatCurrency(totalPrimeira) : '—'}
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
