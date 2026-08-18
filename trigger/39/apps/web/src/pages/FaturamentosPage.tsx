import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type Faturamento } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { nfStatusLabel } from '../lib/fiscalUi';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (f: Faturamento) => f.codigo,
  status: (f: Faturamento) => f.status,
  pedido: (f: Faturamento) => f.pedido?.codigo,
  parceiro: (f: Faturamento) => f.parceiro?.razao_social,
  bruto: (f: Faturamento) => Number(f.valor_bruto),
  sinal: (f: Faturamento) => Number(f.valor_adiantamento),
  saldo: (f: Faturamento) => Number(f.valor_a_cobrar),
  nf: (f: Faturamento) => f.nf_status,
  criado: (f: Faturamento) => f.created_at,
};

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

function nfLabel(status: string, simulada?: boolean): string {
  return nfStatusLabel(status, simulada);
}

function fatStatusLabel(status: string): string {
  if (status === 'CONFIRMADO') return 'Confirmado';
  if (status === 'ESTORNADO') return 'Estornado';
  return status.replace(/_/g, ' ');
}

export function FaturamentosPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Faturamento[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, SORT);

  const load = async (search?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      const qs = params.toString();
      const res = await api.get<{ data: Faturamento[] }>(`/faturamentos${qs ? `?${qs}` : ''}`);
      setRows(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar faturamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q);
  };

  return (
    <>
      <PageHeader
        title="Faturamentos"
        description="Documento FAT- do pedido produzido: apropria o sinal e gera as cobranças do saldo. A NF-e (Focus) entra depois, no mesmo documento."
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="FAT, PED, cliente…" />
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
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              Nenhum faturamento nesta EMP. Pedidos com status Produzido faturam na ficha do pedido.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Documento
                  </SortableTh>
                  <SortableTh column="pedido" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Pedido
                  </SortableTh>
                  <SortableTh
                    column="parceiro"
                    sorts={sorts} sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Cliente
                  </SortableTh>
                  <SortableTh column="bruto" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Valor
                  </SortableTh>
                  <SortableTh column="sinal" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Sinal
                  </SortableTh>
                  <SortableTh column="saldo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    A cobrar
                  </SortableTh>
                  <SortableTh column="nf" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    NF-e
                  </SortableTh>
                  <SortableTh column="criado" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Em
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f) => {
                  const go = () => navigate(`/financeiro/faturamentos/${f.id}`);
                  return (
                    <tr
                      key={f.id}
                      className="clickable"
                      tabIndex={0}
                      role="link"
                      onClick={go}
                      onKeyDown={(e) => activateRow(e, go)}
                    >
                      <td>
                        <strong>{f.codigo}</strong>
                      </td>
                      <td>
                        <StatusPill status={fatStatusLabel(f.status)} />
                      </td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {f.pedido?.id ? (
                          <Link to={`/pedidos/${f.pedido.id}`}>{f.pedido.codigo}</Link>
                        ) : (
                          (f.pedido?.codigo ?? '—')
                        )}
                      </td>
                      <td>{f.parceiro?.razao_social ?? '—'}</td>
                      <td>{formatCurrency(f.valor_bruto)}</td>
                      <td>{formatCurrency(f.valor_adiantamento)}</td>
                      <td>{formatCurrency(f.valor_a_cobrar)}</td>
                      <td>
                        <StatusPill status={nfLabel(f.nf_status, f.nf_simulada)} />
                      </td>
                      <td>{formatDate(f.created_at)}</td>
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
