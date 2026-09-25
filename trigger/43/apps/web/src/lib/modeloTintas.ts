/** Cores nomeadas da arte — spec comercial/operacional, fora do motor (`cores` = estações). */

export const TINTAS_MAX_POR_MODELO = 12;
export const TINTA_MAX_CHARS = 40;

export function normalizeTintaNome(raw: unknown): string | null {
  if (raw == null) return null;
  const nome = String(raw).replace(/\s+/g, ' ').trim();
  if (!nome) return null;
  return nome.length > TINTA_MAX_CHARS ? nome.slice(0, TINTA_MAX_CHARS) : nome;
}

/** Parte rascunho colado ou digitado com vírgula / ponto-e-vírgula / quebra. */
export function splitTintasDraft(raw: string): string[] {
  return String(raw)
    .split(/[,;\n]+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0);
}

export function tintasDeComposicao(
  raw: unknown,
): Array<{ nome: string; tintas: string[] }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      return {
        nome: String(r.nome ?? '').trim(),
        tintas: normalizeTintas(r.tintas),
      };
    })
    .filter((m) => m.nome !== '' && m.tintas.length > 0);
}

/** Lista canônica: trim, sem vazio, sem duplicata no modelo (sem maiúscula), teto 12. */
export function normalizeTintas(raw: unknown): string[] {
  const items = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? splitTintasDraft(raw)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const nome = normalizeTintaNome(item);
    if (!nome) continue;
    const key = nome.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nome);
    if (out.length >= TINTAS_MAX_POR_MODELO) break;
  }
  return out;
}
