import {
  facaPosicaoLabel,
  isFacaPosicao,
  type FacaPosicaoCodigo,
} from '../lib/facaPosicao';

type Props = {
  codigo: string | null | undefined;
  className?: string;
};

/**
 * Seta ↑ ↓ ← → sobreposta à área de apresentação da silhueta.
 * viewBox 100×100 — percorre 100% do container em qualquer tamanho (lista, detalhe, ORC).
 */
export function FacaPosicaoOverlay({ codigo, className }: Props) {
  if (!isFacaPosicao(codigo)) return null;

  const label = facaPosicaoLabel(codigo) ?? codigo;

  return (
    <svg
      className={`faca-posicao-overlay faca-posicao-overlay--${codigo.toLowerCase()}${className ? ` ${className}` : ''}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      role="presentation"
      data-posicao={codigo}
    >
      <title>{label}</title>
      <ArrowGeometry codigo={codigo} />
    </svg>
  );
}

function ArrowGeometry({ codigo }: { codigo: FacaPosicaoCodigo }) {
  /*
   * Traço longo (margem ~8–10%) + cabeça discreta (~10–12 unidades).
   * A ponta permanece legível sem dominar a silhueta.
   */
  switch (codigo) {
    case 'CIMA':
      return (
        <g className="faca-posicao-overlay__g">
          <line x1="50" y1="90" x2="50" y2="22" />
          <polygon points="50,10 57,22 43,22" />
        </g>
      );
    case 'BAIXO':
      return (
        <g className="faca-posicao-overlay__g">
          <line x1="50" y1="10" x2="50" y2="78" />
          <polygon points="50,90 57,78 43,78" />
        </g>
      );
    case 'ESQUERDA':
      return (
        <g className="faca-posicao-overlay__g">
          <line x1="90" y1="50" x2="22" y2="50" />
          <polygon points="10,50 22,43 22,57" />
        </g>
      );
    case 'DIREITA':
      return (
        <g className="faca-posicao-overlay__g">
          <line x1="10" y1="50" x2="78" y2="50" />
          <polygon points="90,50 78,43 78,57" />
        </g>
      );
  }
}
