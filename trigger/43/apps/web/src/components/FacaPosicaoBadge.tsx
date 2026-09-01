import {
  FACA_POSICAO_OPCOES,
  isFacaPosicao,
  type FacaPosicaoCodigo,
} from '../lib/facaPosicao';

type Props = {
  codigo: string | null | undefined;
  /** dock = grade 2×2; pill = cápsula; symbol = só a seta ativa (listas) */
  variant?: 'dock' | 'pill' | 'symbol';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/** Destaque read-only da posição no cilindro — mesmo vocabulário visual do seletor. */
export function FacaPosicaoBadge({
  codigo,
  variant = 'dock',
  size = 'md',
  className,
}: Props) {
  if (!isFacaPosicao(codigo)) return null;

  const opt = FACA_POSICAO_OPCOES.find((o) => o.codigo === codigo);
  if (!opt) return null;

  if (variant === 'pill') {
    return (
      <span
        className={`faca-posicao-badge faca-posicao-badge--pill faca-posicao-badge--${size}${className ? ` ${className}` : ''}`}
        aria-label={`Posição no cilindro: ${opt.rotulo}`}
      >
        <span className="faca-posicao-badge__symbol" aria-hidden="true">
          {opt.simbolo}
        </span>
        <span className="faca-posicao-badge__text">
          <span className="faca-posicao-badge__text-kicker">Posição</span>
          <span className="faca-posicao-badge__text-label">{opt.rotulo}</span>
        </span>
      </span>
    );
  }

  if (variant === 'symbol') {
    return (
      <span
        className={`faca-posicao-badge faca-posicao-badge--symbol faca-posicao-badge--${size}${className ? ` ${className}` : ''}`}
        title={`Posição: ${opt.rotulo}`}
        aria-label={`Posição no cilindro: ${opt.rotulo}`}
      >
        <span aria-hidden="true">{opt.simbolo}</span>
      </span>
    );
  }

  return (
    <div
      className={`faca-posicao-badge faca-posicao-badge--dock faca-posicao-badge--${size}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`Posição no cilindro: ${opt.rotulo}`}
    >
      <span className="faca-posicao-badge__label">Posição</span>
      <div className="faca-posicao-badge__dock-grid" aria-hidden="true">
        {FACA_POSICAO_OPCOES.map((o) => (
          <span
            key={o.codigo}
            className={`faca-posicao-badge__cell${o.codigo === codigo ? ' is-active' : ''}`}
          >
            {o.simbolo}
          </span>
        ))}
      </div>
      <span className="faca-posicao-badge__rotulo">{opt.rotulo}</span>
    </div>
  );
}

export function facaPosicaoCodigoOrNull(raw: string | null | undefined): FacaPosicaoCodigo | null {
  return isFacaPosicao(raw) ? raw : null;
}
