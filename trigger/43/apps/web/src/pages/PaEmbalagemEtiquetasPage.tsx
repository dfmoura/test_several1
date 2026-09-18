import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import {
  VOLUME_ETIQUETA_PRINT_HINT,
  VOLUME_ETIQUETA_PRINTER,
  enableVolumeEtiquetaPrintMode,
} from '../lib/volumeEtiquetaPrint';

type Face = {
  id: number;
  tipo: 'BOBINA' | 'CAIXA';
  codigo: string;
  sequencia: number;
  qtde_etiquetas: string;
  qtde_bobinas?: number;
  tubete?: string | null;
  qr_payload: string;
  pedido?: string | null;
  op?: string | null;
  descricao?: string | null;
  caixa_medida?: string | null;
  total_caixas?: number;
};

/**
 * Etiquetas de identificação BOB/CX — mesma mídia Elgin 50×40 do volume MP.
 */
export function PaEmbalagemEtiquetasPage() {
  const { id } = useParams();
  const [faces, setFaces] = useState<Face[]>([]);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [embCodigo, setEmbCodigo] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => enableVolumeEtiquetaPrintMode(), []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const op = await api.get<{ data: { embalagem?: { id: number; codigo: string } | null } }>(
          `/ordens-producao/${id}`,
        );
        const emb = op.data.embalagem;
        if (!emb) {
          setErr('Confirme a embalagem na OP antes de imprimir.');
          setFaces([]);
          return;
        }
        setEmbCodigo(emb.codigo);
        const res = await api.get<{
          data: { bobinas: Face[]; caixas: Face[] };
        }>(`/pa-embalagens/${emb.id}/etiquetas`);
        const all = [
          ...res.data.caixas.map((c) => ({ ...c, tipo: 'CAIXA' as const })),
          ...res.data.bobinas.map((b) => ({ ...b, tipo: 'BOBINA' as const })),
        ];
        setFaces(all);
        const map: Record<string, string> = {};
        await Promise.all(
          all.map(async (f) => {
            map[f.qr_payload] = await QRCode.toDataURL(f.qr_payload, {
              width: VOLUME_ETIQUETA_PRINTER.qrRenderPx,
              margin: VOLUME_ETIQUETA_PRINTER.qrQuietModules,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#ffffff' },
            });
          }),
        );
        setQrs(map);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Falha ao carregar etiquetas.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="page">
      <PageHeader
        title="Etiquetas de embalagem PA"
        description={embCodigo ? `${embCodigo} · ${VOLUME_ETIQUETA_PRINT_HINT}` : VOLUME_ETIQUETA_PRINT_HINT}
        actions={
          <div className="btn-row no-print">
            <Link to={`/ordens-producao/${id}`} className="btn btn-secondary">
              Voltar à OP
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
              disabled={!faces.length}
            >
              Imprimir
            </button>
          </div>
        }
      />
      {loading ? <p className="muted no-print">Carregando…</p> : null}
      {err ? (
        <p className="form-error no-print" role="alert">
          {err}
        </p>
      ) : null}
      <div className="vol-etiquetas-batch">
        {faces.map((f) => (
          <article
            key={`${f.tipo}-${f.id}`}
            className="vol-etiqueta-sheet"
            aria-label={`Etiqueta ${f.tipo} ${f.codigo}`}
          >
            <div className="vol-etiqueta-face">
              <div className="vol-etiqueta-qr">
                {qrs[f.qr_payload] ? (
                  <img src={qrs[f.qr_payload]} alt="" width={240} height={240} />
                ) : (
                  <div className="vol-etiqueta-qr-ph" aria-hidden />
                )}
              </div>
              <div className="vol-etiqueta-meta">
                <div className="vol-etiqueta-sku">
                  {f.tipo === 'CAIXA' ? 'CAIXA' : 'BOBINA'} {f.sequencia}
                  {f.tipo === 'CAIXA' && f.total_caixas ? `/${f.total_caixas}` : ''}
                </div>
                <div className="vol-etiqueta-desc" title={f.descricao ?? ''}>
                  {f.descricao ?? '—'}
                </div>
                <div className="vol-etiqueta-row">
                  <span className="vol-etiqueta-k">Cód.</span> {f.codigo}
                </div>
                <div className="vol-etiqueta-row">
                  <span className="vol-etiqueta-k">Qtde</span>{' '}
                  {formatDecimalBr(Number(f.qtde_etiquetas), 0)} etiq.
                  {f.tipo === 'CAIXA' && f.qtde_bobinas != null
                    ? ` · ${f.qtde_bobinas} bob.`
                    : ''}
                </div>
                {f.tubete || f.caixa_medida ? (
                  <div className="vol-etiqueta-row">
                    <span className="vol-etiqueta-k">Emb.</span>{' '}
                    {[f.tubete, f.caixa_medida].filter(Boolean).join(' · ')}
                  </div>
                ) : null}
                <div className="vol-etiqueta-row vol-etiqueta-row--muted">
                  {f.pedido ?? '—'} · {f.op ?? '—'}
                </div>
              </div>
              <div className="vol-etiqueta-hri" title={f.qr_payload}>
                <span className="vol-etiqueta-hri-k">Código</span> {f.qr_payload}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
