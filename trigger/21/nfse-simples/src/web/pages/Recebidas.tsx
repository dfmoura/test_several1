import { useEffect, useState } from 'react';
import { api, type NotaRecebida } from '../api';

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

export default function Recebidas() {
  const [notas, setNotas] = useState<NotaRecebida[]>([]);
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.listarRecebidas();
      setNotas(r.items);
      setCnpj(r.cnpjTomador);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setMsg('');
    setError('');
    try {
      const r = await api.sincronizar();
      setMsg(`${r.processados} nota(s) encontrada(s) no gov.br`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <p className="muted">Carregando...</p>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>Notas recebidas</h1>
          <p className="muted">Notas emitidas por outros contra o CNPJ {cnpj}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Buscando...' : 'Buscar no gov.br'}
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {notas.length === 0 ? (
        <div className="card empty">
          <p>Nenhuma nota recebida encontrada.</p>
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Clique em &quot;Buscar no gov.br&quot; para sincronizar notas onde seu CNPJ aparece como tomador.
          </p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Prestador</th>
                <th>Valor</th>
                <th>Emitida em</th>
                <th>Recebida em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => (
                <tr key={n.chave}>
                  <td>
                    <div>{n.prestadorRazaoSocial || n.prestadorCnpj}</div>
                    <div className="muted" style={{ fontSize: '0.75rem' }}>{n.prestadorCnpj}</div>
                  </td>
                  <td>{formatMoney(n.valorServico)}</td>
                  <td>{formatDate(n.emitidaEm)}</td>
                  <td>{formatDate(n.recebidoEm)}</td>
                  <td>
                    <a href={api.downloadUrl(`/nfse/recebidas/${n.chave}/xml`)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} target="_blank" rel="noreferrer">
                      XML
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
