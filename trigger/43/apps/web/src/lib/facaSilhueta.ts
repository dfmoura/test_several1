/** Silhueta real da faca — medidas paramétricas + colunas (1×, 2×…) + SVG opcional. */
import { formatoKind } from '../components/FacaShapeIcon';

export const CONTORNO_SVG_MAX_BYTES = 32768;

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

/**
 * Rótulo das colunas da faca no mapa (≠ colunas de rebobinação do ORC).
 * Vazio → null; "*" e valores numéricos → "N×".
 */
export function formatColunasMapaLabel(raw?: string | null): string | null {
  const t = (raw ?? '').trim();
  if (t === '') return null;
  return `${parseColunasMapa(t)}×`;
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

export type ContornoSvgImportResult =
  | { ok: true; svg: string; source: 'file' | 'paste' }
  | { ok: false; error: string };

/** Remove declaração XML/DOCTYPE comuns em export Corel antes do parse. */
export function stripSvgEnvelope(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[^?]*\?>\s*/i, '')
    .replace(/<!DOCTYPE[^>]*>\s*/i, '')
    .trim();
}

/** Sanitização leve no cliente (preview antes de salvar). Definitiva no servidor. */
export function sanitizeContornoSvgClient(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  let svg = stripSvgEnvelope(raw.trim());
  if (svg.length > CONTORNO_SVG_MAX_BYTES) return null;

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

/**
 * Recorta o viewBox ao contorno real (export Corel traz folha A4 inteira).
 * Só roda no browser; falha silenciosa mantém viewBox original.
 */
export function tightenSvgViewBox(svg: string): string {
  if (typeof document === 'undefined') return svg;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') return svg;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden';

  const clone = root.cloneNode(true) as SVGSVGElement;
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    let bbox: DOMRect;
    try {
      bbox = clone.getBBox();
    } catch {
      return svg;
    }

    if (!(bbox.width > 0 && bbox.height > 0)) return svg;

    const pad = Math.max(bbox.width, bbox.height) * 0.025;
    const x = bbox.x - pad;
    const y = bbox.y - pad;
    const w = bbox.width + pad * 2;
    const h = bbox.height + pad * 2;

    clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    if (!clone.getAttribute('preserveAspectRatio')) {
      clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    return new XMLSerializer().serializeToString(clone);
  } finally {
    document.body.removeChild(host);
  }
}

/** Pipeline único: sanitizar + encaixar viewBox + validar tamanho. */
export function importContornoSvg(
  raw: string,
  source: 'file' | 'paste',
): ContornoSvgImportResult {
  const trimmed = stripSvgEnvelope(raw.trim());
  if (!trimmed) {
    return { ok: false, error: 'Arquivo SVG vazio.' };
  }
  if (trimmed.length > CONTORNO_SVG_MAX_BYTES) {
    return {
      ok: false,
      error: `SVG muito grande (máx. ${Math.round(CONTORNO_SVG_MAX_BYTES / 1024)} KB).`,
    };
  }

  const sanitized = sanitizeContornoSvgClient(trimmed);
  if (!sanitized) {
    return {
      ok: false,
      error:
        source === 'file'
          ? 'SVG inválido ou não permitido. Exporte só o contorno (.svg) do Corel.'
          : 'SVG inválido ou não permitido.',
    };
  }

  let normalized = tightenSvgViewBox(sanitized);
  normalized = sanitizeContornoSvgClient(normalized) ?? sanitized;

  if (normalized.length > CONTORNO_SVG_MAX_BYTES) {
    return {
      ok: false,
      error: `SVG normalizado excede ${Math.round(CONTORNO_SVG_MAX_BYTES / 1024)} KB.`,
    };
  }

  return { ok: true, svg: normalized, source };
}

export type SvgViewBox = { x: number; y: number; w: number; h: number };

/** Marcador no SVG: contorno já traz todas as vias — não repetir por colunas_mapa. */
export const CONTORNO_SVG_COLS_COMPLETO_ATTR = 'data-faca-cols';
export const CONTORNO_SVG_COLS_COMPLETO_VAL = 'completo';

export function parseSvgViewBox(svg: string): SvgViewBox | null {
  const m = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (m) {
    const p = m[1]
      .trim()
      .split(/[\s,]+/)
      .map((x) => Number(x.replace(',', '.')));
    if (p.length >= 4 && p[2] > 0 && p[3] > 0) {
      return { x: p[0], y: p[1], w: p[2], h: p[3] };
    }
  }
  const wm = svg.match(/\bwidth\s*=\s*["']([\d.]+)/i);
  const hm = svg.match(/\bheight\s*=\s*["']([\d.]+)/i);
  if (wm && hm) {
    const w = Number(wm[1]);
    const h = Number(hm[1]);
    if (w > 0 && h > 0) return { x: 0, y: 0, w, h };
  }
  return null;
}

/** Proporção largura/altura do viewBox (para encaixar silhueta alongada). */
export function parseSvgViewBoxAspect(svg: string): number | null {
  const vb = parseSvgViewBox(svg);
  return vb && vb.w > 0 && vb.h > 0 ? vb.w / vb.h : null;
}

/**
 * Contrato de apresentação:
 * - SVG = contorno de **uma** via (unidade).
 * - `colunas_mapa` repete a unidade na silhueta (igual RETA/REDONDA/OVAL).
 * - Exceção: `data-faca-cols="completo"` quando o arquivo já traz todas as vias.
 */
export function contornoSvgJaIncluiColunas(svg?: string | null): boolean {
  if (!svg) return false;
  const re = new RegExp(
    `${CONTORNO_SVG_COLS_COMPLETO_ATTR}\\s*=\\s*["']${CONTORNO_SVG_COLS_COMPLETO_VAL}["']`,
    'i',
  );
  return re.test(svg);
}

export function marcarContornoSvgColsCompleto(svg: string, completo: boolean): string {
  const trimmed = svg.trim();
  if (!trimmed || !/^<svg\b/i.test(trimmed)) return svg;

  let out = trimmed.replace(
    new RegExp(`\\s*${CONTORNO_SVG_COLS_COMPLETO_ATTR}\\s*=\\s*("[^"]*"|'[^']*')`, 'gi'),
    '',
  );
  if (completo) {
    out = out.replace(
      /^<svg\b/i,
      `<svg ${CONTORNO_SVG_COLS_COMPLETO_ATTR}="${CONTORNO_SVG_COLS_COMPLETO_VAL}"`,
    );
  }
  return out;
}

/**
 * Repete o contorno unidade N vezes na horizontal (gap ~4% da largura da via).
 * No-op se cols≤1 ou se o SVG já marca colunas completas.
 */
export function tileContornoSvgPorColunas(svg: string, cols: number): string {
  const n = Math.max(1, Math.min(12, Math.floor(cols)));
  if (n <= 1 || contornoSvgJaIncluiColunas(svg)) return svg;
  if (typeof document === 'undefined') return svg;

  const vb = parseSvgViewBox(svg);
  if (!vb) return svg;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') return svg;

  const gap = vb.w * 0.04;
  const unitGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  unitGroup.setAttribute('data-faca-unidade', '1');
  while (root.firstChild) {
    unitGroup.appendChild(root.firstChild);
  }

  for (let i = 0; i < n; i++) {
    const g = unitGroup.cloneNode(true) as SVGGElement;
    const dx = i * (vb.w + gap);
    if (dx !== 0) g.setAttribute('transform', `translate(${dx} 0)`);
    root.appendChild(g);
  }

  const totalW = n * vb.w + (n - 1) * gap;
  root.setAttribute('viewBox', `${vb.x} ${vb.y} ${totalW} ${vb.h}`);
  root.removeAttribute('width');
  root.removeAttribute('height');
  if (!root.getAttribute('preserveAspectRatio')) {
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  if (!root.getAttribute('xmlns')) {
    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  return new XMLSerializer().serializeToString(root);
}

/** SVG pronto para desenhar: unidade × colunas (ou completo). */
export function contornoSvgParaExibicao(svg: string, colunasMapa?: string | null, compact = false): string {
  const cols = colunasParaDesenho(parseColunasMapa(colunasMapa), compact);
  return tileContornoSvgPorColunas(svg, cols);
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
  if (cols > 1) parts.push(`${cols}× colunas faca`);
  if (temContornoSvg(input)) parts.push('contorno SVG');
  return parts.join(' · ') || 'Silhueta da faca';
}
