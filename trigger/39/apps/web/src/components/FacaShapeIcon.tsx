/** Ícone visual do formato da faca (mapa oficial). */
import type { ReactNode } from 'react';

export type FacaShapeProps = {
  formato?: string | null;
  /** Relação largura/altura aproximada (opcional) */
  aspect?: number;
  size?: number;
  className?: string;
  title?: string;
};

function normalizeFormato(formato?: string | null): string {
  return (formato || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function formatoKind(formato?: string | null): string {
  const f = normalizeFormato(formato);
  if (!f) return 'DESCONHECIDO';
  if (f.startsWith('REDOND')) return 'REDONDA';
  if (f.startsWith('OVAL')) return 'OVAL';
  if (f.includes('SERRILH')) return 'SERRILHA';
  if (f.includes('PICOTE')) return 'PICOTE';
  if (f.includes('GONDOLA')) return 'GONDOLA';
  if (f.includes('LACRE')) return 'LACRE';
  if (f.includes('TAG')) return 'TAG';
  if (f.includes('GAP')) return 'GAP';
  if (f.includes('CORTE')) return 'CORTE';
  if (f.includes('DESENH')) return 'DESENHADA';
  if (f.includes('ESPECIAL') || f.includes('ESP')) return 'ESPECIAL';
  if (f.startsWith('RETA')) return 'RETA';
  return 'ESPECIAL';
}

export function formatoLabel(formato?: string | null): string {
  return (formato || '—').trim() || '—';
}

function clampAspect(aspect?: number): number {
  if (!aspect || !Number.isFinite(aspect) || aspect <= 0) return 1.6;
  return Math.min(2.8, Math.max(0.45, aspect));
}

export function FacaShapeIcon({
  formato,
  aspect,
  size = 36,
  className,
  title,
}: FacaShapeProps) {
  const kind = formatoKind(formato);
  const a = clampAspect(aspect);
  const w = 40;
  const h = 40;
  const stroke = 'currentColor';
  const fill = 'currentColor';
  const tip = title ?? formatoLabel(formato);

  // retângulo centrado com aspect ratio
  const rw = Math.min(30, 18 * Math.sqrt(a));
  const rh = Math.min(28, rw / a);
  const rx = (w - rw) / 2;
  const ry = (h - rh) / 2;

  let body: ReactNode;

  switch (kind) {
    case 'REDONDA':
      body = <circle cx={20} cy={20} r={12} fill={fill} fillOpacity={0.12} stroke={stroke} strokeWidth={1.75} />;
      break;
    case 'OVAL':
      body = (
        <ellipse
          cx={20}
          cy={20}
          rx={14}
          ry={9}
          fill={fill}
          fillOpacity={0.12}
          stroke={stroke}
          strokeWidth={1.75}
        />
      );
      break;
    case 'SERRILHA':
      body = (
        <path
          d="M8 12 L12 8 L16 12 L20 8 L24 12 L28 8 L32 12 V30 H8 Z"
          fill={fill}
          fillOpacity={0.12}
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      );
      break;
    case 'PICOTE':
      body = (
        <>
          <rect x={rx} y={ry} width={rw} height={rh} rx={2} fill={fill} fillOpacity={0.1} stroke={stroke} strokeWidth={1.5} />
          <line x1={rx} y1={20} x2={rx + rw} y2={20} stroke={stroke} strokeWidth={1.25} strokeDasharray="2 2.5" />
        </>
      );
      break;
    case 'GONDOLA':
      body = (
        <path
          d="M10 10 H30 V22 L26 30 H14 L10 22 Z"
          fill={fill}
          fillOpacity={0.12}
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
      break;
    case 'LACRE':
      body = (
        <>
          <circle cx={20} cy={18} r={10} fill={fill} fillOpacity={0.12} stroke={stroke} strokeWidth={1.6} />
          <path d="M14 26 L16 34 L20 30 L24 34 L26 26" fill={fill} fillOpacity={0.12} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
        </>
      );
      break;
    case 'TAG':
      body = (
        <path
          d="M8 14 L22 8 L32 20 L18 30 Z"
          fill={fill}
          fillOpacity={0.12}
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
      break;
    case 'GAP':
      body = (
        <>
          <rect x={7} y={12} width={10} height={16} rx={1.5} fill={fill} fillOpacity={0.12} stroke={stroke} strokeWidth={1.4} />
          <rect x={23} y={12} width={10} height={16} rx={1.5} fill={fill} fillOpacity={0.12} stroke={stroke} strokeWidth={1.4} />
        </>
      );
      break;
    case 'CORTE':
      body = (
        <>
          <line x1={8} y1={20} x2={32} y2={20} stroke={stroke} strokeWidth={1.75} strokeDasharray="3 2" />
          <path d="M28 16 L34 20 L28 24" fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
        </>
      );
      break;
    case 'DESENHADA':
      body = (
        <path
          d="M12 22 C10 14, 16 8, 22 10 C28 12, 34 16, 30 24 C27 30, 18 32, 12 26 Z"
          fill={fill}
          fillOpacity={0.12}
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
      break;
    case 'ESPECIAL':
      body = (
        <path
          d="M20 7 L28 13 L30 23 L22 31 L12 27 L10 16 Z"
          fill={fill}
          fillOpacity={0.12}
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
      break;
    case 'RETA':
    default:
      body = (
        <rect
          x={rx}
          y={ry}
          width={rw}
          height={rh}
          rx={1.5}
          fill={fill}
          fillOpacity={0.12}
          stroke={stroke}
          strokeWidth={1.75}
        />
      );
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={tip}
    >
      <title>{tip}</title>
      {body}
    </svg>
  );
}

export function facaAspectFromRecord(f: Record<string, unknown>): number | undefined {
  const tipo = String(f.tamanho_tipo || '').toLowerCase();
  if (tipo === 'diametro') return 1;
  const larg = Number(f.largura_faca);
  const pux = Number(f.puxada);
  if (larg > 0 && pux > 0) return larg / pux;
  return undefined;
}
