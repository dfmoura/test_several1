import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { api, ApiError, type EstoqueEndereco } from '../lib/api';

/**
 * Etiquetas QR dos vãos (gabarito 6×4×4) — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Payload END:{empresa_id}:{id}:{codigo}. Colar na estante/vão.
 */
export function EstoqueEnderecosEtiquetasPage() {
  const [enderecos, setEnderecos] = useState<EstoqueEndereco[]>([]);
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [prateleiraFiltro, setPrateleiraFiltro] = useState<string>('');

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<{ data: EstoqueEndereco[] }>('/estoque/enderecos');
      setEnderecos(res.data);
      const next: Record<number, string> = {};
      await Promise.all(
        res.data.map(async (e) => {
          next[e.id] = await QRCode.toDataURL(e.qr_payload, { width: 128, margin: 1 });
        }),
      );
      setQrMap(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar vãos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtrados = useMemo(() => {
    if (!prateleiraFiltro) return enderecos;
    const p = Number(prateleiraFiltro);
    return enderecos.filter((e) => e.prateleira === p);
  }, [enderecos, prateleiraFiltro]);

  const seed = async () => {
    setSeeding(true);
    setMsg(null);
    setError(null);
    try {
      const res = await api.post<{ data: { criados: number; existentes: number; total: number } }>(
        '/estoque/enderecos/seed',
      );
      setMsg(
        `Gabarito: ${res.data.total} vãos (${res.data.criados} criados, ${res.data.existentes} já existiam).`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao semear vãos.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Etiquetas dos vãos"
        description="QR da localização (estante). Cole em cada vão P01-C01-V01 … P06-C04-V04."
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary" to="/estoque/guardar">
              Guardar volume
            </Link>
            <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
              Imprimir
            </button>
          </>
        }
      />

      <div className="no-print">
        <EstoqueModuleNav />
      </div>

      {msg && (
        <div className="alert alert-success no-print" style={{ marginBottom: '1rem' }}>
          {msg}
        </div>
      )}
      {error && (
        <div className="alert alert-error no-print" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card no-print" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Prateleira</label>
            <select value={prateleiraFiltro} onChange={(e) => setPrateleiraFiltro(e.target.value)}>
              <option value="">Todas (96)</option>
              {[1, 2, 3, 4, 5, 6].map((p) => (
                <option key={p} value={String(p)}>
                  P{String(p).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          {enderecos.length === 0 && (
            <button type="button" className="btn btn-secondary" disabled={seeding} onClick={() => void seed()}>
              {seeding ? 'Gerando…' : 'Gerar gabarito 6×4×4'}
            </button>
          )}
          <p className="muted" style={{ margin: 0, flex: 1 }}>
            {filtrados.length} etiqueta(s). Payload <code>END:…</code> — use com a tela Guardar após colar no
            vão.
          </p>
        </div>
      </div>

      {loading ? (
        <p>Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="card">
          <div className="card-body">Nenhum vão. Gere o gabarito 6×4×4.</div>
        </div>
      ) : (
        <div className="vao-etiquetas-grid">
          {filtrados.map((e) => (
            <div key={e.id} className="card vao-etiqueta">
              <div className="card-body" style={{ textAlign: 'center', display: 'grid', gap: '0.35rem' }}>
                {qrMap[e.id] ? (
                  <img src={qrMap[e.id]} alt={`QR ${e.codigo}`} width={128} height={128} />
                ) : (
                  <div style={{ width: 128, height: 128, margin: '0 auto', background: '#eee' }} />
                )}
                <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{e.codigo}</div>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  Prat. {e.prateleira} · Col. {e.coluna} · Vão {e.vao}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .vao-etiquetas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
          gap: 0.75rem;
        }
        @media print {
          .no-print, .page-header, nav, .app-sidebar { display: none !important; }
          .vao-etiquetas-grid { grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
          .vao-etiqueta { box-shadow: none; border: 1px solid #000; break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
