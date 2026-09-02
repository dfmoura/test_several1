/**
 * URL pública do formato final da arte (prova para aprovação).
 * Aceita http(s) apontando para PDF, imagem, Drive, Figma, etc.
 * Nunca embute o conteúdo — só link seguro.
 */

const MAX_URL_ARTE = 2048;

export function normalizeUrlArte(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s.length > MAX_URL_ARTE) return null;
  if (!isSafeExternalUrl(s)) return null;
  return s;
}

/** Só http(s) — bloqueia javascript:, data:, etc. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Host amigável para exibição (sem esquema). */
export function urlArteHostLabel(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}
