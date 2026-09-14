import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { api, type NfeEntradaLista } from '../lib/api';
import { formatCnpjCpf, formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  emissao: (n: NfeEntradaLista) => n.data_emissao,
  numero: (n: NfeEntradaLista) => n.numero,
  emitente: (n: NfeEntradaLista) => n.emit_nome,
  valor: (n: NfeEntradaLista) => Number(n.valor_nf ?? 0),
  oc: (n: NfeEntradaLista) => n.ordem_compra?.codigo,
};

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

export function ComprasNfeRecebidasPage() {
  const navigate = useNavigate();
  const anoAtual = new Date().getFullYear();
  const [rows, setRows] = useState<NfeEntradaLista[]>([]);
  const [q, setQ] = useState('');
  const [ano, setAno] = useState(String(anoAtual));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, SORT);

  const load = async (search?: string, year?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (year) params.set('ano', year);
      const qs = params.toString();
      const res = await api.get<{ data: NfeEntradaLista[]; meta: { ano: number } }>(
        `/nfe-entradas${qs ? `?${qs}` : ''}`,
      );
      setRows(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar NF-e recebidas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(undefined, String(anoAtual));
  }, [anoAtual]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void load(q, ano);
  };

  return (
    <>
      <PageHeader
        title="NF-e recebidas"
        description="Espelho fiscal guardado na entrada (após conferência na OC). Não é a caixa do fisco nem escrituração oficial."
        actions={
          <>
            <Link to="/compras/nfe-destinadas" className="btn btn-secondary">
              NF-e destinadas
            </Link>
            <Link to="/compras/ordens" className="btn btn-secondary">
              Ordens de compra
            </Link>
          </>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Número, chave, emitente, OC…"
              />
            </div>
            <div className="form-group" style={{ minWidth: 120 }}>
              <label>Ano</label>
              <select value={ano} onChange={(e) => setAno(e.target.value)}>
                {[anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
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
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              Nenhuma NF-e recebida neste ano. O espelho nasce quando a{' '}
              <Link to="/compras/ordens">ordem de compra</Link> é recebida com XML. Notas do fisco
              ainda não conferidas ficam em{' '}
              <Link to="/compras/nfe-destinadas">NF-e destinadas</Link>.
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
                    NF
                  </SortableTh>
                  <SortableTh
                    column="emitente"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Emitente
                  </SortableTh>
                  <SortableTh
                    column="valor"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    vNF
                  </SortableTh>
                  <SortableTh
                    column="oc"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    OC
                  </SortableTh>
                  <th>XML</th>
                  <th>Chave</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((n) => {
                  const go = () => navigate(`/compras/nfe-recebidas/${n.id}`);
                  return (
                    <tr
                      key={n.id}
                      className="clickable"
                      tabIndex={0}
                      role="link"
                      onClick={go}
                      onKeyDown={(e) => activateRow(e, go)}
                    >
                      <td>{formatDate(n.data_emissao)}</td>
                      <td>
                        <strong>
                          {n.numero ?? '—'}
                          {n.serie ? ` / ${n.serie}` : ''}
                        </strong>
                      </td>
                      <td>
                        <div>{n.emit_nome ?? '—'}</div>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          {n.emit_cnpj ? formatCnpjCpf(n.emit_cnpj) : '—'}
                        </div>
                      </td>
                      <td>{formatCurrency(n.valor_nf)}</td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {n.ordem_compra?.id ? (
                          <Link to={`/compras/ordens/${n.ordem_compra.id}`}>
                            {n.ordem_compra.codigo}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{n.xml_armazenado ? 'Sim' : '—'}</td>
                      <td
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '0.75rem',
                          maxWidth: 140,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={n.chave}
                      >
                        {n.chave}
                      </td>
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
