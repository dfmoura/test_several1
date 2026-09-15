import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { VolumeEtiquetaSheet } from '../components/VolumeEtiquetaSheet';
import { api, ApiError } from '../lib/api';
import {
  VOLUME_ETIQUETA_PRINTER,
  VOLUME_ETIQUETA_PRINT_HINT,
  enableVolumeEtiquetaPrintMode,
  type VolumeEtiquetaFace,
} from '../lib/volumeEtiquetaPrint';

type EtiquetaData = VolumeEtiquetaFace & { qr_payload: string };

/**
 * Etiqueta interna do volume (bobina) — ADR_CADASTRO_INSUMO_VOLUME F3.
 * Canônico: Elgin L42 Pro Full · 50 × 40 mm.
 */
export function EstoqueLoteEtiquetaPage() {
  const { loteId } = useParams();
  const [data, setData] = useState<EtiquetaData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enderecoId, setEnderecoId] = useState('');
  const [enderecos, setEnderecos] = useState<Array<{ id: number; codigo: string }>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => enableVolumeEtiquetaPrintMode(), []);

  const makeQr = async (payload: string) =>
    QRCode.toDataURL(payload, {
      width: VOLUME_ETIQUETA_PRINTER.qrRenderPx,
      margin: VOLUME_ETIQUETA_PRINTER.qrQuietModules,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });

  const load = async () => {
    if (!loteId) return;
    setError(null);
    try {
      const [etiq, ends] = await Promise.all([
        api.get<{ data: EtiquetaData }>(`/estoque/lotes/${loteId}/etiqueta`),
        api.get<{ data: Array<{ id: number; codigo: string }> }>('/estoque/enderecos'),
      ]);
      setData(etiq.data);
      setEnderecos(ends.data);
      if (etiq.data.endereco) setEnderecoId(String(etiq.data.endereco.id));
      setQrDataUrl(await makeQr(etiq.data.qr_payload));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar etiqueta.');
    }
  };

  useEffect(() => {
    void load();
  }, [loteId]);

  const vincular = async () => {
    if (!loteId || !enderecoId) return;
    setMsg(null);
    setError(null);
    try {
      const res = await api.post<{ data: EtiquetaData }>(`/estoque/lotes/${loteId}/endereco`, {
        endereco_id: Number(enderecoId),
      });
      setData(res.data);
      setMsg(`Volume vinculado a ${res.data.endereco?.codigo ?? 'endereço'}.`);
      setQrDataUrl(await makeQr(res.data.qr_payload));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao vincular endereço.');
    }
  };

  if (error && !data) {
    return (
      <div className="page">
        <PageHeader title="Etiqueta do volume" />
        <div className="card">
          <div className="card-body" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <PageHeader title="Etiqueta do volume" />
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Etiqueta do volume"
        description={VOLUME_ETIQUETA_PRINT_HINT}
        actions={
          <>
            <Link className="btn btn-secondary no-print" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary no-print" to="/estoque/guardar">
              Guardar no local
            </Link>
            <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
              Imprimir
            </button>
          </>
        }
      />

      {msg && (
        <div className="card no-print" style={{ marginBottom: '1rem' }}>
          <div className="card-body">{msg}</div>
        </div>
      )}
      {error && (
        <div className="card no-print" style={{ marginBottom: '1rem', borderColor: 'var(--danger)' }}>
          <div className="card-body" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        </div>
      )}

      <div className="vol-etiquetas-print-grid">
        <VolumeEtiquetaSheet
          volume={data}
          qrDataUrl={qrDataUrl}
          qrPayload={data.qr_payload}
        />
      </div>

      <div className="card no-print" style={{ marginTop: '1rem', maxWidth: '28rem' }}>
        <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
          <p className="form-hint" style={{ margin: 0 }}>
            Face colável: QR + <strong>Código</strong> (VOL:…) + SKU/lote/dim/NF. O local{' '}
            <strong>não</strong> sai na etiqueta — amarra-se depois (aqui ou em Guardar com leitor /
            colar o Código).
          </p>
          <label>
            Localização atual no sistema (local)
            <select value={enderecoId} onChange={(e) => setEnderecoId(e.target.value)}>
              <option value="">— selecione —</option>
              {enderecos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo}
                </option>
              ))}
            </select>
          </label>
          {enderecos.length === 0 && (
            <p className="form-hint" style={{ margin: 0 }}>
              Nenhum local cadastrado. Rode <code>php artisan erp:seed-estoque-enderecos</code> (gabarito
              6×4×3).
            </p>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!enderecoId}
            onClick={() => void vincular()}
          >
            Guardar no local
          </button>
        </div>
      </div>
    </div>
  );
}
