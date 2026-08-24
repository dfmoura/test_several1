import { BRAND } from '../lib/brand';

type Variant = 'mark' | 'lockup';

type Props = {
  variant?: Variant;
  className?: string;
  /** Sem alt quando o nome do produto já está visível ao lado. */
  decorative?: boolean;
};

/**
 * Logo do produto FLEXOERP (herói da UI). Atribuição TRIGGER continua em TriggerAttribution.
 * `mark` — nó do ecossistema (sidebar, header, ficha). `lockup` — asset combinado (marca + Syne).
 */
export function ProductLogo({ variant = 'mark', className, decorative = false }: Props) {
  const src = variant === 'lockup' ? BRAND.product.logo : BRAND.product.mark;
  return (
    <img
      src={src}
      alt={decorative ? '' : BRAND.product.logoAlt}
      className={className}
      draggable={false}
    />
  );
}
