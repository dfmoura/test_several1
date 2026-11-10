import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { api } from '../lib/api';
import { formatCnpjCpf, formatCurrency, formatDate } from '../lib/format';
import { appendPeriodo, currentMonthRange, hasPeriodo } from '../lib/periodo';
import { useTableSort } from '../lib/useTableSort';

type Nota = {
  id: number;
  numero: string | null;
  data_emissao: string | null;
  emit_nome: string | null;
  emit_cnpj: string | null;
  valor_total: string | null;
};

const SORT = {
  emissao: (n: Nota) => n.data_emissao,
  numero: (n: Nota) => n.numero,
  prestador: (n: Nota) => n.emit_nome,
  valor: (n: Nota) => Number(n.valor_total ?? 0),
};

export function ComprasNfseVinculadasPage() {
  const mesAtual = currentMonthRange();
  const [rows, setRows] = useState<Nota[]>([]);
  const [q, setQ] = useState('');
  const [de, setDe] = useState(mesAtual.de);
  const [ate, setAte] = useState(mesAtual.ate);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, SORT, {
    initialKey: 'emissao',
    initialDir: 'desc',
  });

  const load = async (search?: string, deVal?: string, ateVal?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      params.set('situacao', 'VINCULADA');
      if (search) params.set('q', search);
      appendPeriodo(params, deVal, ateVal);
      const res = await api.get<{ data: Nota[] }>(`/nfse-tomadas?${params.toString()}`);
      setRows(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as NFS-e vinculadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(undefined, de, ate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (ev: FormEvent) => {
    ev.preventDefault();
    void load(q, de, ate);
  };

  return (
    <>
      <PageHeader
        variant="list"
        title="NFS-e vinculadas"
        description="Serviços conferidos — pagamento em Contas a pagar."
        actions={
          <>
            <Link to="/compras/nfse-tomadas" className="btn btn-secondary">
              Caixa de NFS-e
            </Link>
            <Link to="/financeiro/contas-a-pagar" className="btn btn-secondary">
              Contas a pagar
            </Link>
          </>
        }
      />
      {erro ? <p className="form-error">{erro}</p> : null}
      <div className="list-chrome">
        <form onSubmit={handleSearch} className="list-chrome__filters">
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label>Buscar</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, prestador…" />
          </div>
          <div className="form-group">
            <label htmlFor="nfse-vinculadas-de">De</label>
            <input id="nfse-vinculadas-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="nfse-vinculadas-ate">Até</label>
            <input id="nfse-vinculadas-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary">
            Filtrar
          </button>
        </form>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              {hasPeriodo(de, ate) || q.trim()
                ? 'Nenhuma NFS-e vinculada neste período.'
                : 'Nenhuma NFS-e vinculada.'}{' '}
              A conferência é feita na <Link to="/compras/nfse-tomadas">Caixa de NFS-e</Link>.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh
                    column="emissao"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Emissão
                  </SortableTh>
                  <SortableTh
                    column="numero"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Número
                  </SortableTh>
                  <SortableTh
                    column="prestador"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Prestador
                  </SortableTh>
                  <SortableTh
                    column="valor"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    className="num"
                  >
                    Valor
                  </SortableTh>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((n) => (
                  <tr key={n.id}>
                    <td>{n.data_emissao ? formatDate(n.data_emissao) : '—'}</td>
                    <td>{n.numero || '—'}</td>
                    <td>
                      {n.emit_nome || '—'}
                      {n.emit_cnpj ? <div className="muted">{formatCnpjCpf(n.emit_cnpj)}</div> : null}
                    </td>
                    <td className="num">{n.valor_total ? formatCurrency(Number(n.valor_total)) : '—'}</td>
                    <td>
                      <Link to={`/compras/nfse-tomadas/${n.id}`}>Abrir</Link>
                    </td>
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
