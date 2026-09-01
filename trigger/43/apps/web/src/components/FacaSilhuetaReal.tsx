/**
 * Silhueta real da faca no mapa — contorno paramétrico (RETA/REDONDA/OVAL + N colunas)
 * ou SVG opcional (DESENHADA). Complementa FacaShapeIcon (vocabulário).
 */
import type { ReactNode } from 'react';
import { formatoKind } from './FacaShapeIcon';
import {
  colunasParaDesenho,
  dimensoesFaca,
  parseColunasMapa,
  parseSvgViewBoxAspect,
  sanitizeContornoSvgClient,
  silhuetaTitulo,
  svgDisplayBox,
  temContornoSvg,
  type FacaSilhuetaInput,
} from '../lib/facaSilhueta';

export type FacaSilhuetaRealProps = FacaSilhuetaInput & {
  size?: number;
  variant?: 'compact' | 'featured';
  className?: string;
  title?: string;
  /** Mostra selo "N×" quando há múltiplas colunas */
  showColunasBadge?: boolean;
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function ParametricSilhueta({
  kind,
  cols,
  aspect,
  stroke,
  fill,
}: {
  kind: string;
  cols: number;
  aspect: number;
  stroke: string;
  fill: string;
}): ReactNode {
  const pad = 6;
  const gap = cols > 1 ? 2.5 : 0;
  const availW = 100 - pad * 2 - gap * (cols - 1);
  const unitW = availW / cols;
  const unitH = clamp(unitW / aspect, 12, 88 - pad * 2);
  const totalH = unitH;
  const y = (100 - totalH) / 2;

  const units: ReactNode[] = [];
  for (let i = 0; i < cols; i++) {
    const x = pad + i * (unitW + gap);
    const cx = x + unitW / 2;
    const cy = y + unitH / 2;

    if (kind === 'REDONDA') {
      const r = Math.min(unitW, unitH) / 2 - 0.5;
      units.push(
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill={fill}
          fillOpacity={0.14}
          stroke={stroke}
          strokeWidth={1.6}
        />,
      );
    } else if (kind === 'OVAL') {
      units.push(
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={unitW / 2 - 0.5}
          ry={unitH / 2 - 0.5}
          fill={fill}
          fillOpacity={0.14}
          stroke={stroke}
          strokeWidth={1.6}
        />,
      );
    } else {
      units.push(
        <rect
          key={i}
          x={x + 0.5}
          y={y + 0.5}
          width={unitW - 1}
          height={unitH - 1}
          rx={1.2}
          fill={fill}
          fillOpacity={0.14}
          stroke={stroke}
          strokeWidth={1.6}
        />,
      );
    }
  }

  return <>{units}</>;
}

function SvgContorno({ svg, maxSize }: { svg: string; maxSize: number }) {
  const aspect = parseSvgViewBoxAspect(svg);
  const box = svgDisplayBox(aspect, maxSize);
  return (
    <div
      className="faca-silhueta-svg-inner"
      style={{ width: box.w, height: box.h }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden
    />
  );
}

export function FacaSilhuetaReal({
  formato,
  medida,
  larguraCm,
  puxadaCm,
  diametroCm,
  tamanhoTipo,
  colunasMapa,
  contornoSvg,
  size = 32,
  variant = 'compact',
  className,
  title,
  showColunasBadge = true,
}: FacaSilhuetaRealProps) {
  const input: FacaSilhuetaInput = {
    formato,
    medida,
    larguraCm,
    puxadaCm,
    diametroCm,
    tamanhoTipo,
    colunasMapa,
    contornoSvg,
  };

  const tip = title ?? silhuetaTitulo(input);
  const colsRaw = parseColunasMapa(colunasMapa);
  const cols = colunasParaDesenho(colsRaw, variant === 'compact');
  const svgSafe = sanitizeContornoSvgClient(contornoSvg);
  const dims = dimensoesFaca(input);
  const kind = formatoKind(formato);

  const rootClass = [
    'faca-silhueta',
    `faca-silhueta--${variant}`,
    svgSafe ? 'has-svg' : dims ? 'has-param' : 'is-empty',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  let body: ReactNode = null;
  let boxW = size;
  let boxH = size;

  if (svgSafe) {
    const innerMax = size - (variant === 'featured' ? 8 : 4);
    const aspect = parseSvgViewBoxAspect(svgSafe);
    const box = svgDisplayBox(aspect, innerMax);
    boxW = box.w;
    boxH = box.h;
    body = <SvgContorno svg={svgSafe} maxSize={innerMax} />;
  } else if (dims) {
    const aspect = clamp(dims.largura / dims.altura, 0.35, 4);
    const stroke = 'currentColor';
    const fill = 'currentColor';
    body = (
      <svg
        className="faca-silhueta-param"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden
      >
        <ParametricSilhueta kind={kind} cols={cols} aspect={aspect} stroke={stroke} fill={fill} />
      </svg>
    );
  }

  if (!body) {
    return (
      <span
        className={`${rootClass} is-placeholder`}
        style={{ width: size, height: size }}
        title={tip}
        aria-label={tip}
        role="img"
      />
    );
  }

  return (
    <span
      className={rootClass}
      style={{ width: boxW, height: boxH, minWidth: boxW, minHeight: boxH }}
      title={tip}
      aria-label={tip}
      role="img"
    >
      {body}
      {showColunasBadge && colsRaw > 1 ? (
        <span className="faca-silhueta-cols" aria-hidden>
          {colsRaw}×
        </span>
      ) : null}
    </span>
  );
}

export function facaSilhuetaFromRecord(f: Record<string, unknown>): FacaSilhuetaInput {
  return {
    formato: f.formato as string | undefined,
    medida: f.medida as string | undefined,
    larguraCm: f.largura_faca as number | undefined,
    puxadaCm: f.puxada as number | undefined,
    diametroCm: f.diametro_cm as number | undefined,
    tamanhoTipo: f.tamanho_tipo as string | undefined,
    colunasMapa: f.colunas_mapa as string | undefined,
    contornoSvg: f.contorno_svg as string | undefined,
  };
}

export { temContornoSvg };
