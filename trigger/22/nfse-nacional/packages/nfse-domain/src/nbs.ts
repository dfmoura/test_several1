import { NBS_CATALOG } from './nbs-catalog.js';
import { NBS_CORRELACAO_LC116 } from './nbs-correlacao.js';

export interface NbsItem {
  codigo: string;
  codigoFormatado: string;
  descricao: string;
}

const ITEMS: NbsItem[] = NBS_CATALOG as unknown as NbsItem[];
const BY_CODIGO = new Map(ITEMS.map((item) => [item.codigo, item]));

/** Normaliza entrada para 9 dígitos (cNBS). */
export function normalizeCodigoNbs(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 9) return null;
  return digits;
}

/** Formata cNBS como X.XXXX.XX.XX (ex.: 118064000 → 1.1806.40.00). */
export function formatCodigoNbs(value: string): string {
  const digits = normalizeCodigoNbs(value);
  if (!digits) return value.trim();
  return `${digits[0]}.${digits.slice(1, 5)}.${digits.slice(5, 7)}.${digits.slice(7, 9)}`;
}

/** Descrição oficial da NBS (ANEXO_B). */
export function descricaoNbs(codigo: string): string | null {
  const normalized = normalizeCodigoNbs(codigo);
  if (!normalized) return null;
  return BY_CODIGO.get(normalized)?.descricao ?? null;
}

/** Busca por código exato (9 dígitos, com ou sem pontos). */
export function buscarNbsPorCodigo(codigo: string): NbsItem | null {
  const normalized = normalizeCodigoNbs(codigo);
  if (!normalized) return null;
  return BY_CODIGO.get(normalized) ?? null;
}

/** Prefixo item+subitem da LC 116 (4 dígitos) a partir do cTribNac (6 dígitos). */
export function prefixoLc116DeTribNac(codigoTribNac: string): string | null {
  const digits = codigoTribNac.replace(/\D/g, '');
  if (digits.length !== 6) return null;
  return digits.slice(0, 4);
}

/** NBS correlacionados ao cTribNac (Anexo VIII). */
export function nbsCorrelacionadosTribNac(codigoTribNac: string): NbsItem[] {
  const prefix = prefixoLc116DeTribNac(codigoTribNac);
  if (!prefix) return [];
  const codes = NBS_CORRELACAO_LC116[prefix] ?? [];
  return codes.map((c) => BY_CODIGO.get(c)).filter((item): item is NbsItem => Boolean(item));
}

function normalizeSearchTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca textual na base NBS (código ou descrição).
 * Quando `codigoTribNac` é informado, prioriza códigos correlacionados (Anexo VIII).
 */
export function buscarNbs(query: string, limit = 20, codigoTribNac?: string): NbsItem[] {
  const q = query.trim();
  const correlacionados = codigoTribNac ? nbsCorrelacionadosTribNac(codigoTribNac) : [];
  const pool = correlacionados.length > 0 && !q ? correlacionados : ITEMS;

  if (!q) {
    return (correlacionados.length > 0 ? correlacionados : ITEMS.slice(0, limit)).slice(0, limit);
  }

  const digits = q.replace(/\D/g, '');
  if (digits.length >= 2) {
    const prefixMatches = pool.filter((item) => item.codigo.startsWith(digits));
    if (prefixMatches.length > 0) {
      return prefixMatches.slice(0, limit);
    }
  }

  const normalized = normalizeSearchTerm(q);
  if (!normalized) return [];

  const scored: { item: NbsItem; score: number }[] = [];

  for (const item of pool) {
    const desc = normalizeSearchTerm(item.descricao);
    const formatted = item.codigoFormatado.toLowerCase();

    let score = 0;
    if (correlacionados.some((c) => c.codigo === item.codigo)) {
      score += 6;
    }
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

/** Monta exibição padrão: código formatado + descrição resumida. */
export function formatCodigoNbsComDescricao(
  codigo: string,
  descricao?: string | null,
  maxDescLen = 72,
): string {
  const formatted = formatCodigoNbs(codigo);
  const desc = descricao?.trim() ?? descricaoNbs(codigo);
  if (formatted && desc) {
    const text = desc.length <= maxDescLen ? desc : `${desc.slice(0, maxDescLen).trimEnd()}…`;
    return `${formatted} - ${text}`;
  }
  return formatted || desc || '';
}
