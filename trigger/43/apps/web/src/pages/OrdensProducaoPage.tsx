import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type OrdemProducao } from '../lib/api';
import { formatDate, formatDecimalBr } from '../lib/format';
import { appendPeriodo, currentMonthRange, hasPeriodo } from '../lib/periodo';
import { OP_LISTA_STATUSES, opStatusLabel } from '../lib/producaoUi';
import { useTableSort } from '../lib/useTableSort';

type StatusTab = '' | (typeof OP_LISTA_STATUSES)[number];

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: '', label: 'Todos' },
  ...OP_LISTA_STATUSES.map((id) => ({ id, label: opStatusLabel(id) })),
];

function parseStatusTab(raw: string | null): StatusTab {
  if (!raw) return '';
  return (OP_LISTA_STATUSES as readonly string[]).includes(raw) ? (raw as StatusTab) : '';
}

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

function emptyMessage(status: StatusTab, q: string, de: string, ate: string): string {
  const qTrim = q.trim();
  if (status && !qTrim) {
    return `Nenhuma ordem de produção com status ${opStatusLabel(status)}${hasPeriodo(de, ate) ? ' neste período' : ''}.`;
  }
  if (status || qTrim) {
    return 'Nenhuma OP encontrada com estes filtros.';
  }
  if (hasPeriodo(de, ate)) {
    return 'Nenhuma OP neste período.';
  }
  return 'Nenhuma OP. Abra a partir de um pedido liberado.';
}

export function OrdensProducaoPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ops, setOps] = useState<OrdemProducao[]>([]);
  const [q, setQ] = useState('');
  const mesAtual = currentMonthRange();
  const [de, setDe] = useState(mesAtual.de);
  const [ate, setAte] = useState(mesAtual.ate);
  const [status, setStatusState] = useState<StatusTab>(() => parseStatusTab(searchParams.get('status')));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(ops, SORT);

  const load = useCallback(async (search?: string, st?: string, deVal?: string, ateVal?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      const qTrim = search?.trim();
      if (qTrim) params.set('q', qTrim);
      if (st) params.set('status', st);
      appendPeriodo(params, deVal, ateVal);
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
  }, []);

  useEffect(() => {
    const raw = searchParams.get('status');
    if (raw && !parseStatusTab(raw)) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('status');
          return p;
        },
        { replace: true },
      );
    }
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

  return (
    <>
      <PageHeader
        title="Ordens de produção"
        description="Abra a ordem: a lista do que pegar já vem pronta. Local, quantidade, material."
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="tabs tabs-ordens-producao" role="tablist" aria-label="Status da ordem de produção">
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
              <label htmlFor="ordens-producao-busca">Buscar</label>
              <input
                id="ordens-producao-busca"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="OP, PED…"
              />
            </div>
            <div className="form-group">
              <label htmlFor="ordens-producao-de">De</label>
              <input id="ordens-producao-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="ordens-producao-ate">Até</label>
              <input id="ordens-producao-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
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
        {!loading && ops.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">{ops.length} ordem(ns) nesta EMP</span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">{emptyMessage(status, q, de, ate)}</div>
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
                    Etiqueta
                  </SortableTh>
                  <SortableTh column="qtde" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Quantidade
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
