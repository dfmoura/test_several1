import {
  isSaidaEtiqueta,
  saidaEtiquetaAsset,
  saidaEtiquetaLabel,
  saidaEtiquetaLabelCurto,
} from '../lib/saidaEtiqueta';

type Props = {
  code: string | null | undefined;
  /** compact = só rótulo; thumb = miniatura + rótulo; dense = thumb + rótulo curto */
  variant?: 'compact' | 'thumb' | 'dense';
  className?: string;
};

/** Exibe a saída escolhida (detalhe, proposta, ficha). */
export function SaidaEtiquetaBadge({ code, variant = 'compact', className = '' }: Props) {
  if (!isSaidaEtiqueta(code)) return null;
  const dense = variant === 'dense';
  const rotulo = dense ? saidaEtiquetaLabelCurto(code) : saidaEtiquetaLabel(code);
  const asset = saidaEtiquetaAsset(code);
  if (!rotulo) return null;

  if ((variant === 'thumb' || dense) && asset) {
    return (
      <div
        className={`saida-etiqueta-badge saida-etiqueta-badge--thumb${
          dense ? ' saida-etiqueta-badge--dense' : ''
        } ${className}`.trim()}
      >
        <img src={asset} alt="" className="saida-etiqueta-badge__img" />
        <span className="saida-etiqueta-badge__text">{rotulo}</span>
      </div>
    );
  }

  return (
    <span className={`saida-etiqueta-badge saida-etiqueta-badge--compact ${className}`.trim()}>
      {rotulo}
    </span>
  );
}
