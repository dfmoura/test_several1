import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type EmpresaContaFinanceira,
  type Titulo,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { titStatusLabel } from '../lib/comprasUi';
import { formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (t: Titulo) => t.codigo,
  fornecedor: (t: Titulo) => t.parceiro?.razao_social,
  documento: (t: Titulo) => t.documento,
  vencimento: (t: Titulo) => t.vencimento,
  valor: (t: Titulo) => Number(t.valor),
  saldo: (t: Titulo) => Number(t.saldo),
  status: (t: Titulo) => t.status,
};

export function ContasReceberPage() {
  const { hasPermission, empresaId } = useAuth();
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [contas, setContas] = useState<EmpresaContaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Titulo | null>(null);
  const [contaId, setContaId] = useState('');
  const [valor, setValor] = useState('');
  const [pagoEm, setPagoEm] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(titulos, SORT);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Titulo[] }>('/titulos?tipo=RECEBER');
      setTitulos(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    void api
      .get<{ data: { contas_financeiras?: EmpresaContaFinanceira[] } }>(`/empresas/${empresaId}`)
      .then((emp) => setContas(emp.data.contas_financeiras ?? []))
      .catch(() => setContas([]));
  }, [empresaId]);

  const openBaixa = (t: Titulo) => {
    setSelected(t);
    setValor(t.saldo);
    setError(null);
    setMsg(null);
  };

  const baixar = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setMsg(null);
    try {
      await api.post(`/titulos/${selected.id}/baixar`, {
        conta_financeira_id: Number(contaId),
        valor,
        pago_em: pagoEm,
      });
      setMsg(`Baixa registrada em ${selected.codigo}.`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha na baixa.');
    }
  };

  return (
    <>
      <PageHeader
        title="Contas a receber"
        description="Títulos a receber (TIT-) — adiantamento de orçamento e faturamento do pedido. Baixa (BX-) contra CFIN; webhook PIX também baixa automaticamente."
      />

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: selected ? '1rem' : undefined }}>
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">Nenhum título a receber.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh
                    column="fornecedor"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Cliente
                  </SortableTh>
                  <SortableTh
                    column="documento"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Documento
                  </SortableTh>
                  <SortableTh
                    column="vencimento"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Vencimento
                  </SortableTh>
                  <SortableTh column="valor" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Valor
                  </SortableTh>
                  <SortableTh column="saldo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Saldo
                  </SortableTh>
                  <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id}>
                    <td>{t.codigo}</td>
                    <td>{t.parceiro?.nome_fantasia || t.parceiro?.razao_social}</td>
                    <td>{t.documento || '—'}</td>
                    <td>{formatDate(t.vencimento)}</td>
                    <td>{formatCurrency(t.valor)}</td>
                    <td>{formatCurrency(t.saldo)}</td>
                    <td>
                      <StatusPill status={titStatusLabel(t.status)} />
                    </td>
                    <td>
                      {hasPermission('financeiro.escrever') &&
                        (t.status === 'ABERTO' || t.status === 'PARCIAL') && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => openBaixa(t)}
                          >
                            Baixar
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <form onSubmit={(e) => void baixar(e)}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Baixar {selected.codigo}</h3>
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Conta financeira</label>
                    <select
                      required
                      value={contaId}
                      onChange={(e) => setContaId(e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} — {c.descricao}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valor</label>
                    <input
                      required
                      inputMode="decimal"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Pago em</label>
                    <input
                      type="date"
                      required
                      value={pagoEm}
                      onChange={(e) => setPagoEm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Confirmar BX
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelected(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
