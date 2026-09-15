import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatQty } from '../lib/format';
import {
  formatVolumeDimensao,
  type VolumeEtiquetaFace,
} from '../lib/volumeEtiquetaPrint';

type Props = {
  volume: VolumeEtiquetaFace;
  qrDataUrl: string | null;
  /** Mesma string do QR (`VOL:…`) — HRI impresso + cópia na tela. */
  qrPayload: string;
  /** Link “Unitária” só na reimpressão em lote (oculto na impressão). */
  unitariaTo?: string;
};

/**
 * Face física 50×40 mm — Elgin L42 Pro Full.
 * Identidade do volume (QR + HRI VOL:… + SKU + lote + dim + NF). Sem vão:
 * localização é volátil e amarra-se depois (Guardar / vínculo na tela) — ADR F3/F4.
 */
export function VolumeEtiquetaSheet({
  volume,
  qrDataUrl,
  qrPayload,
  unitariaTo,
}: Props) {
  const dim = formatVolumeDimensao(volume.largura_mm, volume.comprimento_m);
  const sku = volume.produto?.codigo ?? '—';
  const desc = volume.produto?.descricao_fiscal?.trim() || '—';
  const vaoSistema = volume.endereco?.codigo ?? null;
  const [copied, setCopied] = useState(false);

  const copyCodigo = async () => {
    const text = qrPayload.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="vol-etiqueta-sheet" aria-label={`Etiqueta volume ${volume.codigo}`}>
      <div className="vol-etiqueta-face">
        <div className="vol-etiqueta-qr">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="" width={240} height={240} />
          ) : (
            <div className="vol-etiqueta-qr-ph" aria-hidden />
          )}
        </div>
        <div className="vol-etiqueta-meta">
          <div className="vol-etiqueta-sku">{sku}</div>
          <div className="vol-etiqueta-desc" title={desc}>
            {desc}
          </div>
          <div className="vol-etiqueta-row">
            <span className="vol-etiqueta-k">Lote</span> {volume.codigo}
          </div>
          <div className="vol-etiqueta-row">
            <span className="vol-etiqueta-k">Qtde</span> {formatQty(volume.qtde)}{' '}
            {volume.unidade}
          </div>
          <div className="vol-etiqueta-row">
            <span className="vol-etiqueta-k">Dim.</span> {dim}
          </div>
          <div className="vol-etiqueta-row vol-etiqueta-row--muted">
            <span className="vol-etiqueta-k">NF</span> {volume.nf_numero ?? '—'}
            {' · '}
            {volume.data_entrada ? formatDate(volume.data_entrada) : '—'}
          </div>
        </div>
        <div className="vol-etiqueta-hri" title={qrPayload}>
          <span className="vol-etiqueta-hri-k">Código</span> {qrPayload}
        </div>
      </div>
      <div className="no-print vol-etiqueta-screen-meta">
        <span className="muted">
          {vaoSistema
            ? `No sistema: local ${vaoSistema} (não imprime — pode mudar)`
            : 'No sistema: sem local (amarre depois em Guardar)'}
        </span>
        {qrPayload ? (
          <>
            {' · '}
            <button
              type="button"
              className="linkish"
              onClick={() => void copyCodigo()}
            >
              {copied ? 'Código copiado' : 'Copiar código'}
            </button>
          </>
        ) : null}
        {unitariaTo ? (
          <>
            {' · '}
            <Link to={unitariaTo}>Unitária</Link>
          </>
        ) : null}
      </div>
    </article>
  );
}
