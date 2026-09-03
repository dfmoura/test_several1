import type { CSSProperties, ReactNode } from 'react';
import { facaPosicaoLabel, isFacaPosicao } from '../lib/facaPosicao';
import { FacaPosicaoOverlay } from './FacaPosicaoOverlay';

type Props = {
  children: ReactNode;
  /** Posição no cilindro — se válida, a seta cobre toda a área */
  posicao?: string | null;
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** compact = lista; featured = detalhe/ORC */
  size?: 'compact' | 'featured';
  /** fine = lista densa: seta mais estreita para a silhueta ler primeiro */
  arrowWeight?: 'regular' | 'fine';
};

/**
 * Área de apresentação da silhueta (mapa / ORC).
 * A seta de posição, quando informada, sobrepõe e percorre 100% deste frame —
 * independente do tamanho interno da silhueta paramétrica ou SVG.
 */
export function FacaApresentacao({
  children,
  posicao,
  className,
  style,
  title,
  size = 'featured',
  arrowWeight = 'regular',
}: Props) {
  const has = isFacaPosicao(posicao);
  const posLabel = has ? facaPosicaoLabel(posicao) : null;

  return (
    <div
      className={[
        'faca-apresentacao',
        `faca-apresentacao--${size}`,
        has ? 'has-posicao' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      title={title ?? (posLabel ? `Posição: ${posLabel}` : undefined)}
      aria-label={posLabel ? `Silhueta da faca com posição ${posLabel}` : undefined}
    >
      <div className="faca-apresentacao__silhueta">{children}</div>
      {has ? <FacaPosicaoOverlay codigo={posicao} weight={arrowWeight} /> : null}
    </div>
  );
}
