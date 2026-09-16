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

type EtiquetasFiltro = {
  movimento_id?: number | null;
  movimento_tipo?: string | null;
  ids?: number[] | null;
};

/**
 * Reimpressão de QR dos volumes (bobinas) — F3 · Elgin 50×40.
 * ?movimento_id= → entrada NF ou AJUSTE (A03/VIRADA).
 * ?ids=1&ids=2 → seleção explícita (API).
 */
export function EstoqueVolumesEtiquetasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const semEndereco = searchParams.get('sem_endereco') === '1';
  const movimentoId = searchParams.get('movimento_id');
  const idsParam = searchParams.getAll('ids').filter((x) => /^\d+$/.test(x));
  const [volumes, setVolumes] = useState<VolumeEtiqueta[]>([]);
  const [filtro, setFiltro] = useState<EtiquetasFiltro>({});
  const [qrMap, setQrMap] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => enableVolumeEtiquetaPrintMode(), []);

  const load = async (onlySemVao: boolean, movId: string | null, ids: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (onlySemVao) params.set('sem_endereco', '1');
      if (movId) params.set('movimento_id', movId);
      for (const id of ids) params.append('ids', id);
      const qs = params.toString();
      const res = await api.get<{
        data: {
          volumes: VolumeEtiqueta[];
          volumes_count: number;
          filtro?: EtiquetasFiltro;
        };
      }>(`/estoque/lotes/etiquetas${qs ? `?${qs}` : ''}`);
      setVolumes(res.data.volumes);
      setFiltro(res.data.filtro ?? {});
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

  const idsKey = idsParam.join(',');
  useEffect(() => {
    void load(semEndereco, movimentoId, idsParam);
    // idsParam via idsKey — evita re-fetch por nova referência de array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semEndereco, movimentoId, idsKey]);

  const isAjuste = filtro.movimento_tipo === 'AJUSTE';
  const isEntradaCompra = filtro.movimento_tipo === 'ENTRADA_COMPRA';

  const titulo = useMemo(() => {
    if (movimentoId && isAjuste) return 'Etiquetas dos volumes do ajuste';
    if (movimentoId) return 'Etiquetas dos volumes da entrada';
    if (idsParam.length > 0) return 'Etiquetas dos volumes selecionados';
    if (semEndereco) return 'Volumes sem local';
    return 'Reimprimir etiquetas de volume';
  }, [movimentoId, isAjuste, idsParam.length, semEndereco]);

  const descricao = useMemo(() => {
    if (movimentoId && isAjuste) {
      return `${volumes.length} volume(s) deste ajuste (A03/VIRADA) — cole o QR na bobina (50×40 mm)`;
    }
    if (movimentoId) {
      return `${volumes.length} volume(s) desta entrada — cole o QR na bobina (50×40 mm)`;
    }
    return `${volumes.length} volume(s) com saldo — cole o QR na bobina`;
  }, [movimentoId, isAjuste, volumes.length]);

  return (
    <div className="page">
      <PageHeader
        title={titulo}
        description={descricao}
        actions={
          <>
            {movimentoId && isEntradaCompra ? (
              <Link
                className="btn btn-secondary"
                to={`/estoque/movimentos/${movimentoId}/ficha-entrada`}
              >
                Ficha de entrada
              </Link>
            ) : null}
            {movimentoId && isAjuste ? (
              <Link className="btn btn-secondary" to="/estoque/ajustes">
                Ajustes
              </Link>
            ) : null}
            <Link className="btn btn-secondary" to="/estoque">
              Estoque
            </Link>
            <Link className="btn btn-secondary" to="/estoque/guardar">
              Guardar no local
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
          {!movimentoId && idsParam.length === 0 ? (
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
                Só volumes ainda sem local
              </label>
              <span className="muted">Mesmo QR da etiqueta unitária e da ficha de entrada.</span>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              {isAjuste
                ? 'Volumes do ajuste de implantação · mesmo QR da etiqueta unitária.'
                : idsParam.length > 0
                  ? 'Volumes selecionados · mesmo QR da etiqueta unitária.'
                  : 'Volumes do movimento de entrada · mesmo QR da ficha e da etiqueta unitária.'}
            </p>
          )}
          <p className="vol-etiqueta-print-hint">
            {VOLUME_ETIQUETA_PRINT_HINT}. Face = QR + Código (VOL:…) + SKU/lote/dim/NF — sem local
            (amarre depois em Guardar).
          </p>
        </div>
      </div>

      {loading ? (
        <p className="no-print">Carregando…</p>
      ) : volumes.length === 0 ? (
        <div className="card no-print">
          <div className="card-body">
            {movimentoId
              ? isAjuste
                ? 'Este ajuste não gerou volume físico (SKU sem controle de lote) ou o movimento não tem lotes.'
                : 'Esta entrada não gerou volume físico (SKU sem controle de lote) ou o movimento não tem lotes.'
              : semEndereco
                ? 'Nenhum volume sem local. Todos já estão localizados ou não há saldo.'
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
              qrPayload={v.qr_payload}
              unitariaTo={`/estoque/lotes/${v.lote_id}/etiqueta`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
