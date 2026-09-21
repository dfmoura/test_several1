import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
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
  /**
   * Clique/teclado abre overlay com a figura ampliada (proposta / ficha do cliente).
   * Só com thumb/dense + asset. Impressão ignora o overlay.
   */
  previewable?: boolean;
};

/** Exibe a saída escolhida (detalhe, proposta, ficha). */
export function SaidaEtiquetaBadge({
  code,
  variant = 'compact',
  className = '',
  previewable = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const valid = isSaidaEtiqueta(code);
  const dense = variant === 'dense';
  const rotuloCurto = valid
    ? dense
      ? saidaEtiquetaLabelCurto(code)
      : saidaEtiquetaLabel(code)
    : null;
  const rotuloCompleto = valid ? saidaEtiquetaLabel(code) : null;
  const asset = valid ? saidaEtiquetaAsset(code) : null;
  const canPreview = Boolean(
    previewable && valid && (variant === 'thumb' || dense) && asset && rotuloCurto,
  );

  const close = useCallback(() => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    queueMicrotask(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!valid || !rotuloCurto) return null;

  const openPreview = () => {
    if (!canPreview) return;
    setOpen(true);
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPreview();
    }
  };

  const thumbClass = `saida-etiqueta-badge saida-etiqueta-badge--thumb${
    dense ? ' saida-etiqueta-badge--dense' : ''
  }${canPreview ? ' saida-etiqueta-badge--previewable' : ''} ${className}`.trim();

  const preview =
    open && canPreview && asset && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="saida-etiqueta-preview"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <button
              type="button"
              className="saida-etiqueta-preview__backdrop"
              aria-label="Fechar"
              onClick={close}
            />
            <div className="saida-etiqueta-preview__panel">
              <div className="saida-etiqueta-preview__head">
                <h2 id={titleId}>Saída da etiqueta</h2>
                <button
                  ref={closeRef}
                  type="button"
                  className="btn btn-ghost saida-etiqueta-preview__close"
                  onClick={close}
                >
                  Fechar
                </button>
              </div>
              <div className="saida-etiqueta-preview__body">
                <img
                  src={asset}
                  alt={rotuloCompleto ?? rotuloCurto}
                  className="saida-etiqueta-preview__img"
                />
                <p className="saida-etiqueta-preview__rotulo">{rotuloCompleto}</p>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  if ((variant === 'thumb' || dense) && asset) {
    if (canPreview) {
      return (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={thumbClass}
            onClick={openPreview}
            onKeyDown={onTriggerKey}
            title="Ampliar saída"
            aria-label={`Ampliar: ${rotuloCompleto ?? rotuloCurto}`}
          >
            <img src={asset} alt="" className="saida-etiqueta-badge__img" />
            <span className="saida-etiqueta-badge__text">{rotuloCurto}</span>
          </button>
          {preview}
        </>
      );
    }

    return (
      <div className={thumbClass}>
        <img src={asset} alt="" className="saida-etiqueta-badge__img" />
        <span className="saida-etiqueta-badge__text">{rotuloCurto}</span>
      </div>
    );
  }

  return (
    <span className={`saida-etiqueta-badge saida-etiqueta-badge--compact ${className}`.trim()}>
      {rotuloCurto}
    </span>
  );
}
