import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { VolumeEtiquetaSheet } from '../components/VolumeEtiquetaSheet';
import { api, ApiError } from '../lib/api';
import {
  VOLUME_ETIQUETA_PRINTER,
  VOLUME_ETIQUETA_PRINT_HINT,
  enableVolumeEtiquetaPrintMode,
  type VolumeEtiquetaFace,
} from '../lib/volumeEtiquetaPrint';

type VolumeEtiqueta = VolumeEtiquetaFace & { qr_payload: string };

/**
 * Reimpressão de QR dos volumes (bobinas) — fora do MOV de entrada.
 * Canônico: Elgin L42 Pro Full · 50 × 40 mm (ADR F3).
 */
export function EstoqueVolumesEtiquetasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const semEndereco = searchParams.get('sem_endereco') === '1';
  const [volumes, setVolumes] = useState<VolumeEtiqueta[]>([]);
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => enableVolumeEtiquetaPrintMode(), []);

  const load = async (onlySemVao: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = onlySemVao ? '?sem_endereco=1' : '';
      const res = await api.get<{ data: { volumes: VolumeEtiqueta[]; volumes_count: number } }>(
        `/estoque/lotes/etiquetas${qs}`,
      );
      setVolumes(res.data.volumes);
      const next: Record<number, string> = {};
      await Promise.all(
        res.data.volumes.map(async (v) => {
          next[v.lote_id] = await QRCode.toDataURL(v.qr_payload, {
            width: VOLUME_ETIQUETA_PRINTER.qrRenderPx,
            margin: VOLUME_ETIQUETA_PRINTER.qrQuietModules,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
          });
        }),
      );
      setQrMap(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar etiquetas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(semEndereco);
  }, [semEndereco]);

  const titulo = useMemo(
    () => (semEndereco ? 'Volumes sem vão' : 'Reimprimir etiquetas de volume'),
    [semEndereco],
  );

  return (
    <div className="page">
      <PageHeader
        title={titulo}
        description={`${volumes.length} volume(s) com saldo — cole o QR na bobina`}
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary" to="/estoque/guardar">
              Guardar no vão
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

      {error && (
        <div className="alert alert-error no-print" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card no-print" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'grid', gap: '0.65rem' }}>
          <div className="btn-row" style={{ alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
              <input
                type="checkbox"
                checked={semEndereco}
                onChange={(e) => {
                  const next = new URLSearchParams(searchParams);
                  if (e.target.checked) next.set('sem_endereco', '1');
                  else next.delete('sem_endereco');
                  setSearchParams(next);
                }}
              />
              Só volumes ainda sem vão
            </label>
            <span className="muted">Mesmo QR da etiqueta unitária e da ficha de entrada.</span>
          </div>
          <p className="vol-etiqueta-print-hint">
            {VOLUME_ETIQUETA_PRINT_HINT}. Face = identidade do volume (sem vão — amarre depois em
            Guardar).
          </p>
        </div>
      </div>

      {loading ? (
        <p className="no-print">Carregando…</p>
      ) : volumes.length === 0 ? (
        <div className="card no-print">
          <div className="card-body">
            {semEndereco
              ? 'Nenhum volume sem vão. Todos já estão localizados ou não há saldo.'
              : 'Nenhum volume com saldo para imprimir.'}
          </div>
        </div>
      ) : (
        <div className="vol-etiquetas-print-grid">
          {volumes.map((v) => (
            <VolumeEtiquetaSheet
              key={v.lote_id}
              volume={v}
              qrDataUrl={qrMap[v.lote_id] ?? null}
              unitariaTo={`/estoque/lotes/${v.lote_id}/etiqueta`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
