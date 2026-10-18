import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type OrdemCompra } from '../lib/api';
import { useAuth } from '../lib/auth';
import { OC_LISTA_STATUSES, ocStatusLabel } from '../lib/comprasUi';
import { formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

type StatusTab = '' | (typeof OC_LISTA_STATUSES)[number];

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: '', label: 'Todos' },
  ...OC_LISTA_STATUSES.map((id) => ({ id, label: ocStatusLabel(id) })),
];

function parseStatusTab(raw: string | null): StatusTab {
  if (!raw) return '';
  return (OC_LISTA_STATUSES as readonly string[]).includes(raw) ? (raw as StatusTab) : '';
}

const SORT = {
  codigo: (o: OrdemCompra) => o.codigo,
  fornecedor: (o: OrdemCompra) => o.fornecedor?.razao_social,
  status: (o: OrdemCompra) => o.status,
  total: (o: OrdemCompra) => Number(o.valor_total),
  previsao: (o: OrdemCompra) => o.previsao_entrega,
};

function emptyMessage(status: StatusTab, q: string): string {
  const qTrim = q.trim();
  if (status && !qTrim) {
    return `Nenhuma ordem de compra com status ${ocStatusLabel(status)}.`;
  }
  if (status || qTrim) {
    return 'Nenhuma ordem de compra encontrada com estes filtros.';
  }
  return 'Nenhuma ordem de compra.';
}

export function ComprasOrdensPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatusState] = useState<StatusTab>(() => parseStatusTab(searchParams.get('status')));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(ordens, SORT);

  const load = useCallback(async (search?: string, st?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      const qTrim = search?.trim();
      if (qTrim) params.set('q', qTrim);
      if (st) params.set('status', st);
      const qs = params.toString();
      const res = await api.get<{ data: OrdemCompra[] }>(
        `/ordens-compra${qs ? `?${qs}` : ''}`,
      );
      setOrdens(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar ordens de compra.');
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
        title="Ordens de compra"
        description="Prepare a OC em rascunho, envie ao fornecedor e receba com NF × conferência. Sem OC enviada não entra saldo."
        actions={
          hasPermission('compras.escrever') ? (
            <Link to="/compras/ordens/nova" className="btn btn-primary">
              Nova OC
            </Link>
          ) : undefined
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="tabs tabs-ordens-compra" role="tablist" aria-label="Status da ordem de compra">
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
              <label htmlFor="ordens-compra-busca">Buscar</label>
              <input
                id="ordens-compra-busca"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Código, fornecedor…"
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
                  <SortableTh column="fornecedor" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Fornecedor
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="total" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Total
                  </SortableTh>
                  <SortableTh column="previsao" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Previsão
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable"
                    onClick={() => navigate(`/compras/ordens/${o.id}`)}
                  >
                    <td>
                      <strong>{o.codigo}</strong>
                      {o.urgente && (
                        <span className="muted" style={{ marginLeft: '0.5rem' }}>
                          urgente
                        </span>
                      )}
                      {o.origem === 'DIRETA' && (
                        <span className="muted" style={{ marginLeft: '0.35rem' }}>
                          · direta
                        </span>
                      )}
                    </td>
                    <td>{o.fornecedor?.nome_fantasia || o.fornecedor?.razao_social || '—'}</td>
                    <td>
                      <StatusPill status={ocStatusLabel(o.status)} />
                    </td>
                    <td>{formatCurrency(o.valor_total)}</td>
                    <td>{formatDate(o.previsao_entrega)}</td>
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
