/** Silhueta real da faca — medidas paramétricas + colunas (1×, 2×…) + SVG opcional. */
import { formatoKind } from '../components/FacaShapeIcon';

export type FacaDimensoes = {
  largura: number;
  altura: number;
};

export type FacaSilhuetaInput = {
  formato?: string | null;
  medida?: string | null;
  larguraCm?: number | string | null;
  puxadaCm?: number | string | null;
  diametroCm?: number | string | null;
  tamanhoTipo?: string | null;
  colunasMapa?: string | null;
  contornoSvg?: string | null;
};

function numOrNull(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrai N colunas do mapa (1×, 2×, 3×…). "*" e vazio → 1. */
export function parseColunasMapa(raw?: string | null): number {
  const t = (raw ?? '').trim();
  if (t === '' || t === '*') return 1;
  const m = t.match(/\d+/);
  if (!m) return 1;
  const n = parseInt(m[0], 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 12);
}

/** Número de vias desenhadas na miniatura (compacto). */
export function colunasParaDesenho(n: number, compact: boolean): number {
  if (n <= 1) return 1;
  return compact ? Math.min(n, 6) : Math.min(n, 12);
}

export function parseMedidaDims(medida?: string | null): FacaDimensoes | null {
  const m = (medida ?? '').trim().replace(/\s+/g, '');
  if (!m) return null;

  const diamMatch = m.match(/^[ØøO]?\s*([\d.,]+)/u);
  if (/^[ØøO]/u.test(m) && diamMatch) {
    const d = numOrNull(diamMatch[1]);
    return d ? { largura: d, altura: d } : null;
  }

  const parts = m.split(/[xX×]/u);
  if (parts.length >= 2) {
    const larg = numOrNull(parts[0]);
    const alt = numOrNull(parts[1]);
    if (larg && alt) return { largura: larg, altura: alt };
  }

  return null;
}

export function dimensoesFaca(input: FacaSilhuetaInput): FacaDimensoes | null {
  const kind = formatoKind(input.formato);
  const fromMedida = parseMedidaDims(input.medida);

  if (kind === 'REDONDA') {
    const d = numOrNull(input.diametroCm) ?? fromMedida?.largura;
    return d ? { largura: d, altura: d } : fromMedida;
  }

  const larg = numOrNull(input.larguraCm) ?? fromMedida?.largura;
  const alt = numOrNull(input.puxadaCm) ?? fromMedida?.altura;
  if (larg && alt) return { largura: larg, altura: alt };

  return fromMedida;
}

export function podeSilhuetaParametrica(input: FacaSilhuetaInput): boolean {
  const kind = formatoKind(input.formato);
  if (!['RETA', 'REDONDA', 'OVAL'].includes(kind)) return false;
  return dimensoesFaca(input) != null;
}

export function temContornoSvg(input: FacaSilhuetaInput): boolean {
  return sanitizeContornoSvgClient(input.contornoSvg) != null;
}

/** Sanitização leve no cliente (preview antes de salvar). Definitiva no servidor. */
export function sanitizeContornoSvgClient(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  let svg = raw.trim();
  if (svg.length > 32768) return null;

  const lower = svg.toLowerCase();
  for (const blocked of ['<script', 'javascript:', 'data:text/html', '<iframe', '<foreignobject']) {
    if (lower.includes(blocked)) return null;
  }
  if (!/<(svg|path|g|polygon|polyline|circle|ellipse|rect|line)\b/i.test(svg)) return null;

  svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  svg = svg.replace(/<\/?(script|foreignObject|iframe|object|embed|image|use|style)[^>]*>/gi, '');
  svg = svg.replace(/\s(on\w+|xlink:href|href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  svg = svg.trim();
  if (!svg) return null;

  if (!/^<svg/i.test(svg)) {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor">${svg}</svg>`;
  }

  if (!/preserveAspectRatio/i.test(svg)) {
    svg = svg.replace(/^<svg/i, '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return svg;
}

/** Proporção largura/altura do viewBox (para encaixar silhueta alongada). */
export function parseSvgViewBoxAspect(svg: string): number | null {
  const m = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (m) {
    const p = m[1]
      .trim()
      .split(/[\s,]+/)
      .map((x) => Number(x.replace(',', '.')));
    if (p.length >= 4 && p[2] > 0 && p[3] > 0) return p[2] / p[3];
  }
  const wm = svg.match(/\bwidth\s*=\s*["']([\d.]+)/i);
  const hm = svg.match(/\bheight\s*=\s*["']([\d.]+)/i);
  if (wm && hm) {
    const w = Number(wm[1]);
    const h = Number(hm[1]);
    if (w > 0 && h > 0) return w / h;
  }
  return null;
}

/** Caixa de exibição: alongadas não viram tracinho em preview quadrado. */
export function svgDisplayBox(aspect: number | null, max: number): { w: number; h: number } {
  const a = aspect != null && aspect > 0 ? aspect : 1;
  if (a >= 1) {
    return { w: max, h: Math.max(max * 0.4, max / a) };
  }
  const h = max;
  const w = Math.max(max * 0.32, max * a);
  return { w, h };
}

export function silhuetaTitulo(input: FacaSilhuetaInput): string {
  const dims = dimensoesFaca(input);
  const cols = parseColunasMapa(input.colunasMapa);
  const med = (input.medida ?? '').trim();
  const parts: string[] = [];
  if (med) parts.push(med);
  if (dims) {
    parts.push(`${dims.largura}×${dims.altura} cm`);
  }
  if (cols > 1) parts.push(`${cols} colunas`);
  if (temContornoSvg(input)) parts.push('contorno SVG');
  return parts.join(' · ') || 'Silhueta da faca';
}
