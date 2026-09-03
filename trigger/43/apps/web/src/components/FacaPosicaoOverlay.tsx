import {
  facaPosicaoLabel,
  isFacaPosicao,
  type FacaPosicaoCodigo,
} from '../lib/facaPosicao';

type Props = {
  codigo: string | null | undefined;
  className?: string;
  /** regular = detalhe/ORC; fine = lista: haste e cabeça mais estreitas */
  weight?: 'regular' | 'fine';
};

/**
 * Seta ↑ ↓ ← → sobreposta à área de apresentação da silhueta.
 * viewBox 100×100 — percorre 100% do container em qualquer tamanho (lista, detalhe, ORC).
 */
export function FacaPosicaoOverlay({ codigo, className, weight = 'regular' }: Props) {
  if (!isFacaPosicao(codigo)) return null;

  const label = facaPosicaoLabel(codigo) ?? codigo;
  const fine = weight === 'fine';

  return (
    <svg
      className={`faca-posicao-overlay faca-posicao-overlay--${codigo.toLowerCase()}${fine ? ' faca-posicao-overlay--fine' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      role="presentation"
      data-posicao={codigo}
    >
      <title>{label}</title>
      <ArrowGeometry codigo={codigo} fine={fine} />
    </svg>
  );
}

function ArrowGeometry({ codigo, fine }: { codigo: FacaPosicaoCodigo; fine: boolean }) {
  /*
   * regular: traço longo (margem ~8–10%) + cabeça ~14 unidades.
   * fine: haste mais curta nas pontas + cabeça ~8 unidades — a silhueta lê primeiro.
   */
  switch (codigo) {
    case 'CIMA':
      return fine ? (
        <g className="faca-posicao-overlay__g">
          <line x1="50" y1="86" x2="50" y2="18" />
          <polygon points="50,9 54.2,18.5 45.8,18.5" />
        </g>
      ) : (
        <g className="faca-posicao-overlay__g">
          <line x1="50" y1="90" x2="50" y2="22" />
          <polygon points="50,10 57,22 43,22" />
        </g>
      );
    case 'BAIXO':
      return fine ? (
        <g className="faca-posicao-overlay__g">
          <line x1="50" y1="14" x2="50" y2="82" />
          <polygon points="50,91 54.2,81.5 45.8,81.5" />
        </g>
      ) : (
        <g className="faca-posicao-overlay__g">
          <line x1="50" y1="10" x2="50" y2="78" />
          <polygon points="50,90 57,78 43,78" />
        </g>
      );
    case 'ESQUERDA':
      return fine ? (
        <g className="faca-posicao-overlay__g">
          <line x1="86" y1="50" x2="18" y2="50" />
          <polygon points="9,50 18.5,45.8 18.5,54.2" />
        </g>
      ) : (
        <g className="faca-posicao-overlay__g">
          <line x1="90" y1="50" x2="22" y2="50" />
          <polygon points="10,50 22,43 22,57" />
        </g>
      );
    case 'DIREITA':
      return fine ? (
        <g className="faca-posicao-overlay__g">
          <line x1="14" y1="50" x2="82" y2="50" />
          <polygon points="91,50 81.5,45.8 81.5,54.2" />
        </g>
      ) : (
        <g className="faca-posicao-overlay__g">
          <line x1="10" y1="50" x2="78" y2="50" />
          <polygon points="90,50 78,43 78,57" />
        </g>
      );
  }
}
