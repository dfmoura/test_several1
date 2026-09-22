import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Pedido } from '../lib/api';
import { formatDate } from '../lib/format';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { PED_STATUSES, pedStatusLabel, type PedStatus } from '../lib/producaoUi';
import { useTableSort } from '../lib/useTableSort';

type StatusTab = '' | PedStatus;

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: '', label: 'Todos' },
  ...PED_STATUSES.map((id) => ({ id, label: pedStatusLabel(id) })),
];

function parseStatusTab(raw: string | null): StatusTab {
  if (!raw) return '';
  return (PED_STATUSES as readonly string[]).includes(raw) ? (raw as PedStatus) : '';
}

const SORT = {
  codigo: (p: Pedido) => p.codigo,
  parceiro: (p: Pedido) => p.parceiro?.razao_social,
  item: (p: Pedido) => p.itens[0]?.descricao,
  orcamento: (p: Pedido) => p.orcamento?.codigo,
  status: (p: Pedido) => p.status,
  prazo: (p: Pedido) => p.prazo_entrega_dias,
  criado: (p: Pedido) => p.created_at,
};

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

function emptyMessage(status: StatusTab, q: string): string {
  const qTrim = q.trim();
  if (status && !qTrim) {
    return `Nenhum pedido com status ${pedStatusLabel(status)}.`;
  }
  if (status || qTrim) {
    return 'Nenhum pedido encontrado com estes filtros.';
  }
  return 'Nenhum pedido. Aprove um orçamento com liberação financeira.';
}

export function PedidosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatusState] = useState<StatusTab>(() => parseStatusTab(searchParams.get('status')));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(pedidos, SORT);

  const load = useCallback(async (search?: string, st?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      const qTrim = search?.trim();
      if (qTrim) params.set('q', qTrim);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: Pedido[] }>(`/pedidos${qs ? `?${qs}` : ''}`);
      setPedidos(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar pedidos.');
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
        title="Pedidos"
        description="Nascem do orçamento liberado (crédito ou adiantamento baixado). Produção abre OP/OS; pedido produzido segue para faturamento e depois à expedição."
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="tabs tabs-pedidos" role="tablist" aria-label="Status do pedido">
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
              <label htmlFor="pedidos-busca">Buscar</label>
              <input
                id="pedidos-busca"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="PED, ORC, cliente…"
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
        {!loading && pedidos.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">{pedidos.length} pedido(s) nesta EMP</span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">{emptyMessage(status, q)}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh
                    column="parceiro"
                    sorts={sorts} sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Cliente
                  </SortableTh>
                  <SortableTh column="item" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Item
                  </SortableTh>
                  <SortableTh
                    column="orcamento"
                    sorts={sorts} sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    ORC
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="prazo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Prazo
                  </SortableTh>
                  <SortableTh column="criado" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Criado
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const go = () => navigate(`/pedidos/${p.id}`);
                  return (
                    <tr
                      key={p.id}
                      className="clickable"
                      tabIndex={0}
                      role="link"
                      onClick={go}
                      onKeyDown={(e) => activateRow(e, go)}
                    >
                      <td>
                        <strong>{p.codigo}</strong>
                      </td>
                      <td>
                        {p.parceiro?.razao_social ?? '—'}
                        {p.vendedor ? (
                          <div className="muted" style={{ fontSize: '0.8em' }}>
                            {p.vendedor.codigo}
                          </div>
                        ) : null}
                      </td>
                      <td>{p.itens[0]?.descricao ?? '—'}</td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {p.orcamento?.id ? (
                          <Link to={`/orcamentos/${p.orcamento.id}`}>{p.orcamento.codigo}</Link>
                        ) : (
                          (p.orcamento?.codigo ?? '—')
                        )}
                      </td>
                      <td>
                        <StatusPill status={pedStatusLabel(p.status)} />
                      </td>
                      <td>{p.prazo_entrega_dias != null ? prazoEntregaCompleto(p) : '—'}</td>
                      <td>{formatDate(p.created_at)}</td>
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
