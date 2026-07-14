import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, type NotaEmitida } from '../api';

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

function situacaoBadge(s: string) {
  if (s === 'AUTORIZADA') return 'badge-success';
  if (s === 'CANCELADA') return 'badge-danger';
  return 'badge-info';
}

export default function Emitidas() {
  const [notas, setNotas] = useState<NotaEmitida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<NotaEmitida | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [msg, setMsg] = useState('');
  const location = useLocation();

  useEffect(() => {
    load();
    const nova = (location.state as { novaNota?: string })?.novaNota;
    if (nova) setMsg(`Nota ${nova.slice(0, 10)}... emitida com sucesso!`);
  }, [location.state]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.listarEmitidas();
      setNotas(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelar() {
    if (!selected || selected.situacao !== 'AUTORIZADA') return;
    if (cancelMotivo.length < 15) {
      setError('Motivo deve ter pelo menos 15 caracteres');
      return;
    }
    setCanceling(true);
    setError('');
    try {
      await api.cancelar(selected.chaveAcesso, cancelMotivo);
      setMsg('Nota cancelada com sucesso');
      setSelected(null);
      setCancelMotivo('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar');
    } finally {
      setCanceling(false);
    }
  }

  if (loading) return <p className="muted">Carregando...</p>;

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>Notas emitidas</h1>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {notas.length === 0 ? (
        <div className="card empty">Nenhuma nota emitida ainda.</div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tomador</th>
                <th>Valor</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => (
                <tr key={n.chaveAcesso}>
                  <td>{formatDate(n.emitidaEm)}</td>
                  <td>{n.tomadorNome ?? n.tomadorDoc}</td>
                  <td>{formatMoney(n.valorServico)}</td>
                  <td><span className={`badge ${situacaoBadge(n.situacao)}`}>{n.situacao}</span></td>
                  <td>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setSelected(n)}>
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Detalhes da nota</h2>
          <table>
            <tbody>
              <tr><td>Chave</td><td style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{selected.chaveAcesso}</td></tr>
              <tr><td>Tomador</td><td>{selected.tomadorNome}</td></tr>
              <tr><td>Descrição</td><td>{selected.descricao}</td></tr>
              <tr><td>Valor</td><td>{formatMoney(selected.valorServico)}</td></tr>
              <tr><td>Situação</td><td><span className={`badge ${situacaoBadge(selected.situacao)}`}>{selected.situacao}</span></td></tr>
            </tbody>
          </table>

          <div className="actions">
            <a href={api.downloadUrl(`/nfse/emitidas/${selected.chaveAcesso}/xml`)} className="btn btn-secondary" target="_blank" rel="noreferrer">Baixar XML</a>
            <a href={api.downloadUrl(`/nfse/emitidas/${selected.chaveAcesso}/pdf`)} className="btn btn-secondary" target="_blank" rel="noreferrer">Baixar PDF</a>
          </div>

          {selected.situacao === 'AUTORIZADA' && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h2>Cancelar nota</h2>
              <div className="form-group">
                <label>Motivo (mínimo 15 caracteres)</label>
                <textarea
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  rows={2}
                  placeholder="Ex: Erro na emissão da nota fiscal de serviço"
                />
              </div>
              <button type="button" className="btn btn-danger" onClick={handleCancelar} disabled={canceling}>
                {canceling ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          )}

          <button type="button" className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setSelected(null)}>Fechar</button>
        </div>
      )}
    </>
  );
}
