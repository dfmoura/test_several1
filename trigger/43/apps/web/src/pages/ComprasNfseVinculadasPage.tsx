import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { formatCnpjCpf, formatCurrency, formatDate } from '../lib/format';

type Nota = {
  id: number;
  numero: string | null;
  data_emissao: string | null;
  emit_nome: string | null;
  emit_cnpj: string | null;
  valor_total: string | null;
};

export function ComprasNfseVinculadasPage() {
  const [rows, setRows] = useState<Nota[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = async (search?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      params.set('situacao', 'VINCULADA');
      if (search) params.set('q', search);
      const res = await api.get<{ data: Nota[] }>(`/nfse-tomadas?${params.toString()}`);
      setRows(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as NFS-e vinculadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (ev: FormEvent) => {
    ev.preventDefault();
    void load(q);
  };

  return (
    <>
      <PageHeader
        title="NFS-e vinculadas"
        description="Notas de serviço já conferidas. O pagamento fica em Contas a pagar, com a natureza e o vencimento que você definiu."
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
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, prestador…" />
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
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              Nenhuma NFS-e vinculada. A conferência é feita na{' '}
              <Link to="/compras/nfse-tomadas">Caixa de NFS-e</Link>.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Emissão</th>
                  <th>Número</th>
                  <th>Prestador</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id}>
                    <td>{n.data_emissao ? formatDate(n.data_emissao) : '—'}</td>
                    <td>{n.numero || '—'}</td>
                    <td>
                      {n.emit_nome || '—'}
                      {n.emit_cnpj ? <div className="muted">{formatCnpjCpf(n.emit_cnpj)}</div> : null}
                    </td>
                    <td>{n.valor_total ? formatCurrency(Number(n.valor_total)) : '—'}</td>
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
