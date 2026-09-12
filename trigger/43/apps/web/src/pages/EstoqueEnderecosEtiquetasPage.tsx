import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { VaoEtiquetaSheet } from '../components/VaoEtiquetaSheet';
import { api, ApiError, type EstoqueEndereco } from '../lib/api';
import {
  VOLUME_ETIQUETA_PRINTER,
  VOLUME_ETIQUETA_PRINT_HINT,
  enableVolumeEtiquetaPrintMode,
} from '../lib/volumeEtiquetaPrint';

/**
 * Etiquetas QR dos vãos (gabarito 6×4×3) — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Payload END:{empresa_id}:{id}:{codigo}. Impressão: Elgin L42 Pro Full · 50×40 mm
 * (mesmo canal do volume — uma face = uma etiqueta na bobina térmica).
 */
export function EstoqueEnderecosEtiquetasPage() {
  const [enderecos, setEnderecos] = useState<EstoqueEndereco[]>([]);
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [prateleiraFiltro, setPrateleiraFiltro] = useState<string>('');

  useEffect(() => enableVolumeEtiquetaPrintMode(), []);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<{ data: EstoqueEndereco[] }>('/estoque/enderecos');
      setEnderecos(res.data);
      const next: Record<number, string> = {};
      await Promise.all(
        res.data.map(async (e) => {
          next[e.id] = await QRCode.toDataURL(e.qr_payload, {
            width: VOLUME_ETIQUETA_PRINTER.qrRenderPx,
            margin: VOLUME_ETIQUETA_PRINTER.qrQuietModules,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
          });
        }),
      );
      setQrMap(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar locais.');
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
      const res = await api.post<{
        data: {
          criados: number;
          existentes: number;
          renomeados?: number;
          desativados: number;
          total: number;
        };
      }>('/estoque/enderecos/seed');
      const d = res.data;
      const renomeados = (d.renomeados ?? 0) > 0 ? `, ${d.renomeados} V→L` : '';
      const desativados =
        d.desativados > 0 ? `, ${d.desativados} fora do gabarito desativado(s)` : '';
      setMsg(
        `Gabarito 6×4×3: ${d.total} locais (${d.criados} criados, ${d.existentes} ok${renomeados}${desativados}).`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao semear locais.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Etiquetas dos locais"
        description="QR da localização (estante). Cole em cada local P01-C01-L01 … P06-C04-L03."
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
        <div className="card-body" style={{ display: 'grid', gap: '0.65rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Prateleira</label>
              <select value={prateleiraFiltro} onChange={(e) => setPrateleiraFiltro(e.target.value)}>
                <option value="">Todas (72)</option>
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <option key={p} value={String(p)}>
                    P{String(p).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-secondary" disabled={seeding} onClick={() => void seed()}>
              {seeding
                ? 'Alinhando…'
                : enderecos.length === 0
                  ? 'Gerar gabarito 6×4×3'
                  : 'Alinhar gabarito 6×4×3'}
            </button>
            <p className="muted" style={{ margin: 0, flex: 1 }}>
              {filtrados.length} etiqueta(s). Cole a etiqueta no local da estante. Depois, em{' '}
              <Link to="/estoque/guardar">Guardar</Link>, leia o QR do volume e o QR deste local.
            </p>
          </div>
          <p className="vol-etiqueta-print-hint">
            {VOLUME_ETIQUETA_PRINT_HINT}. Uma face = uma etiqueta na bobina (mesmo driver do volume).
          </p>
        </div>
      </div>

      {loading ? (
        <p>Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="card">
          <div className="card-body">Nenhum local. Gere o gabarito 6×4×3.</div>
        </div>
      ) : (
        <div className="vao-etiquetas-print-grid">
          {filtrados.map((e) => (
            <VaoEtiquetaSheet key={e.id} endereco={e} qrDataUrl={qrMap[e.id] ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
