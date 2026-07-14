import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StatusResponse } from '../api';

function formatCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export default function Inicio() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    api.status().then(setStatus).catch((e) => setError(e.message));
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const r = await api.sincronizar();
      setSyncMsg(`${r.processados} nota(s) sincronizada(s)`);
      const s = await api.status();
      setStatus(s);
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!status) return <p className="muted">Carregando...</p>;

  const certOk = status.certificado.ativo;
  const isProd = status.ambiente === 'prod';

  return (
    <>
      <h1 style={{ marginBottom: '0.5rem' }}>Olá, {status.emitente.razaoSocial}</h1>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        CNPJ {formatCnpj(status.emitente.cnpj)}
      </p>

      {isProd && (
        <div className="alert alert-warning">
          Ambiente de <strong>PRODUÇÃO</strong> — notas emitidas têm valor fiscal real.
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{status.totais.emitidas}</div>
          <div className="stat-label">Notas emitidas</div>
        </div>
        <div className="stat">
          <div className="stat-value">{status.totais.recebidas}</div>
          <div className="stat-label">Notas recebidas</div>
        </div>
        <div className="stat">
          <div className="stat-value">{status.totais.canceladas}</div>
          <div className="stat-label">Canceladas</div>
        </div>
      </div>

      <div className="card">
        <h2>Status do sistema</h2>
        <table>
          <tbody>
            <tr>
              <td>Ambiente</td>
              <td>
                <span className={`badge ${isProd ? 'badge-danger' : 'badge-info'}`}>
                  {status.ambienteLabel}
                </span>
                {status.govMock && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Simulado</span>}
              </td>
            </tr>
            <tr>
              <td>Certificado digital</td>
              <td>
                {certOk ? (
                  <span className="badge badge-success">
                    OK — {status.certificado.diasParaExpirar} dias restantes
                  </span>
                ) : (
                  <span className="badge badge-danger">Inativo ou não configurado</span>
                )}
              </td>
            </tr>
            <tr>
              <td>Município emissor</td>
              <td>{status.emitente.codigoMunicipio}</td>
            </tr>
            <tr>
              <td>Inscrição Municipal</td>
              <td>{status.emitente.inscricaoMunicipal ?? <span className="muted">Não configurada</span>}</td>
            </tr>
          </tbody>
        </table>

        <div className="actions">
          <Link to="/emitir" className="btn btn-primary">Emitir nota</Link>
          <button type="button" className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Buscar notas recebidas'}
          </button>
        </div>
        {syncMsg && <p className="muted" style={{ marginTop: '0.75rem' }}>{syncMsg}</p>}
      </div>
    </>
  );
}
