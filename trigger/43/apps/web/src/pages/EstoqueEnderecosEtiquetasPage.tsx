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
 * Etiquetas QR dos locais L00000001.
 * Payload END:{empresa_id}:{id}:{codigo}. Impressão: Elgin L42 Pro Full · 50×40 mm.
 */
export function EstoqueEnderecosEtiquetasPage() {
  const [enderecos, setEnderecos] = useState<EstoqueEndereco[]>([]);
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [busca, setBusca] = useState('');

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
    const termo = busca.trim().toLowerCase();
    if (!termo) return enderecos;
    return enderecos.filter((e) => {
      const nome = (e.nome ?? '').toLowerCase();
      return e.codigo.toLowerCase().includes(termo) || nome.includes(termo);
    });
  }, [enderecos, busca]);

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
      const renomeados = (d.renomeados ?? 0) > 0 ? `, ${d.renomeados} alinhados para L` : '';
      const desativados =
        d.desativados > 0 ? `, ${d.desativados} duplicado(s) inativado(s)` : '';
      setMsg(
        `Locais L00000001–L${String(d.total).padStart(8, '0')}: ${d.criados} criados, ${d.existentes} já existiam${renomeados}${desativados}.`,
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
        description="QR do local. O código impresso é L00000001. Cole no endereço físico."
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
              <label htmlFor="etq-local">Local</label>
              <input
                id="etq-local"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Todos (${enderecos.length})`}
              />
            </div>
            <button type="button" className="btn btn-secondary" disabled={seeding} onClick={() => void seed()}>
              {seeding
                ? 'Alinhando…'
                : enderecos.length === 0
                  ? 'Gerar L00000001–L00000072'
                  : 'Alinhar L00000001–L00000072'}
            </button>
            <p className="muted" style={{ margin: 0, flex: 1 }}>
              {filtrados.length} etiqueta(s). Cole no local. Depois, em{' '}
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
          <div className="card-body">Nenhum local. Gere L00000001–L00000072.</div>
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
