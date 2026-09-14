import {
  isSaidaEtiqueta,
  saidaEtiquetaAsset,
  saidaEtiquetaLabel,
} from '../lib/saidaEtiqueta';

type Props = {
  code: string | null | undefined;
  /** compact = só rótulo; thumb = miniatura + rótulo */
  variant?: 'compact' | 'thumb';
  className?: string;
};

/** Exibe a saída escolhida (detalhe, proposta, ficha). */
export function SaidaEtiquetaBadge({ code, variant = 'compact', className = '' }: Props) {
  if (!isSaidaEtiqueta(code)) return null;
  const rotulo = saidaEtiquetaLabel(code);
  const asset = saidaEtiquetaAsset(code);
  if (!rotulo) return null;

  if (variant === 'thumb' && asset) {
    return (
      <div className={`saida-etiqueta-badge saida-etiqueta-badge--thumb ${className}`.trim()}>
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
