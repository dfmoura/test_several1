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
  situacao: string;
  chave: string | null;
};

type Sync = {
  sync_status: string;
  sync_mensagem: string | null;
  ultimo_nsu: string;
  pode_sincronizar: boolean;
};

export function ComprasNfseCaixaPage() {
  const [rows, setRows] = useState<Nota[]>([]);
  const [q, setQ] = useState('');
  const [sync, setSync] = useState<Sync | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const load = async (search?: string) => {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      params.set('situacao', 'NA_CAIXA');
      if (search) params.set('q', search);
      const [lista, estado] = await Promise.all([
        api.get<{ data: Nota[] }>(`/nfse-tomadas?${params.toString()}`),
        api.get<{ data: Sync }>('/nfse-sync'),
      ]);
      setRows(lista.data);
      setSync(estado.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a caixa de NFS-e.');
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

  const atualizar = async () => {
    setSincronizando(true);
    setErro(null);
    try {
      await api.post('/nfse-sync', {});
      await load(q);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível atualizar a caixa.');
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Caixa de NFS-e"
        description="Serviços que outros prestadores emitiram contra o CNPJ desta empresa. A conferência organiza o contas a pagar. Nada entra no estoque."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void atualizar()}
              disabled={sincronizando || sync?.pode_sincronizar === false}
            >
              {sincronizando ? 'Atualizando…' : 'Atualizar do fisco'}
            </button>
            <Link to="/compras/nfse-vinculadas" className="btn btn-secondary">
              NFS-e vinculadas
            </Link>
          </>
        }
      />

      {sync?.sync_mensagem ? <p className="muted">{sync.sync_mensagem}</p> : null}
      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Número, prestador, chave…"
              />
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
              Nenhuma NFS-e aguardando conferência. Neste ambiente local, Atualizar do fisco
              coloca uma nota de ensaio na caixa (sem valor fiscal). O pagamento só nasce quando
              você confirma a nota.
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
                      {n.emit_cnpj ? (
                        <div className="muted">{formatCnpjCpf(n.emit_cnpj)}</div>
                      ) : null}
                    </td>
                    <td>{n.valor_total ? formatCurrency(Number(n.valor_total)) : '—'}</td>
                    <td>
                      <Link to={`/compras/nfse-tomadas/${n.id}`}>Conferir</Link>
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
