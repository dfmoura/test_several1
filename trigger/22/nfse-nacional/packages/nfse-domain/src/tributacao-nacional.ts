import { TRIBUTACAO_NACIONAL_CATALOG } from './tributacao-nacional-catalog.js';

export interface TributacaoNacionalItem {
  codigo: string;
  item: string;
  subitem: string;
  desdobro: string;
  descricao: string;
}

const ITEMS: TributacaoNacionalItem[] = TRIBUTACAO_NACIONAL_CATALOG as TributacaoNacionalItem[];
const BY_CODIGO = new Map(ITEMS.map((item) => [item.codigo, item]));

/** Normaliza entrada para 6 dígitos (cTribNac). */
export function normalizeCodigoTribNac(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 6) return null;
  return digits;
}

/** Formata cTribNac como II.SS.DD (ex.: 170202 → 17.02.02). */
export function formatCodigoTribNac(value: string): string {
  const digits = normalizeCodigoTribNac(value);
  if (!digits) return value.trim();
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/** Descrição oficial da base nacional (LC 116 / desdobro nacional). */
export function descricaoTributacaoNacional(codigo: string): string | null {
  const normalized = normalizeCodigoTribNac(codigo);
  if (!normalized) return null;
  return BY_CODIGO.get(normalized)?.descricao ?? null;
}

/** Busca por código exato (6 dígitos, com ou sem pontos). */
export function buscarTributacaoPorCodigo(codigo: string): TributacaoNacionalItem | null {
  const normalized = normalizeCodigoTribNac(codigo);
  if (!normalized) return null;
  return BY_CODIGO.get(normalized) ?? null;
}

function normalizeSearchTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca textual na base nacional (código ou descrição).
 * Aceita código parcial (ex.: "17.02", "1702") ou termos da descrição.
 */
export function buscarTributacaoNacional(query: string, limit = 20): TributacaoNacionalItem[] {
  const q = query.trim();
  if (!q) return [];

  const digits = q.replace(/\D/g, '');
  if (digits.length >= 2) {
    const prefixMatches = ITEMS.filter((item) => item.codigo.startsWith(digits));
    if (prefixMatches.length > 0) {
      return prefixMatches.slice(0, limit);
    }
  }

  const normalized = normalizeSearchTerm(q);
  if (!normalized) return [];

  const scored: { item: TributacaoNacionalItem; score: number }[] = [];

  for (const item of ITEMS) {
    const desc = normalizeSearchTerm(item.descricao);
    const formatted = formatCodigoTribNac(item.codigo).toLowerCase();

    let score = 0;
    if (formatted.includes(normalized) || item.codigo.includes(digits)) {
      score += 3;
    }
    if (desc.startsWith(normalized)) {
      score += 5;
    } else if (desc.includes(normalized)) {
      score += 2;
    }

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every((w) => desc.includes(w))) {
      score += 4;
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.codigo.localeCompare(b.item.codigo))
    .slice(0, limit)
    .map(({ item }) => item);
}

/**
 * Resumo da descrição para exibição compacta (PDF, labels).
 * Mantém informação útil sem ocupar todo o campo.
 */
export function resumirDescricaoTributacao(descricao: string, maxLen = 72): string {
  const text = descricao.trim();
  if (text.length <= maxLen) return text;

  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

/** Monta exibição padrão: código formatado + descrição resumida. */
export function formatCodigoTribComDescricao(codigo: string, descricao?: string | null, maxDescLen = 72): string {
  const formatted = formatCodigoTribNac(codigo);
  const desc = descricao?.trim();
  if (formatted && desc) {
    return `${formatted} - ${resumirDescricaoTributacao(desc, maxDescLen)}`;
  }
  return formatted || desc || '';
}
