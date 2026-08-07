import { BRAND } from '../lib/brand';

export type TriggerAttributionVariant = 'interactive' | 'print';

type Props = {
  /** interactive = login/sidebar (link). print = ficha/impressão (sem link). */
  variant: TriggerAttributionVariant;
  className?: string;
  /** Classes extras no ícone/marca */
  logoClassName?: string;
};

/**
 * Atribuição canônica da TRIGGER — permanente, legível e não-herói.
 * Tipografia contida: marca + rótulo + nome completo numa linha (sem “TRIGGER” gritante).
 * @see docs/IDENTIDADE_TRIGGER.md
 */
export function TriggerAttribution({ variant, className, logoClassName }: Props) {
  const { vendor, attribution } = BRAND;

  if (variant === 'print') {
    return (
      <span className={className}>
        <span>{attribution.printLabel}</span>
        <img
          src={vendor.assets.mark}
          alt=""
          className={logoClassName}
          aria-hidden
          draggable={false}
        />
        <span className="trigger-attr-print-name">{vendor.shortName}</span>
      </span>
    );
  }

  return (
    <a
      className={className}
      href={vendor.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${attribution.interactiveLabel} ${vendor.fullName}`}
    >
      <img
        src={vendor.assets.mark}
        alt=""
        className={logoClassName ?? 'trigger-attr-mark'}
        aria-hidden
        draggable={false}
      />
      <span className="trigger-attr-stack">
        <span className="trigger-attr-label">{attribution.interactiveLabel}</span>
        <span className="trigger-attr-name">{vendor.fullName}</span>
      </span>
    </a>
  );
}

/** Byline discreto sob o nome do produto (padrão trigger/12). */
export function TriggerByline({ className }: { className?: string }) {
  return <span className={className}>{BRAND.licensee.byline}</span>;
}
