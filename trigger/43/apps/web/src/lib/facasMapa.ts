/** Vocabulário visual canônico. Formatos e máquinas extras vêm do mapa/catálogo da EMP. */
export const FORMATOS_CANONICOS = [
  'RETA',
  'REDONDA',
  'OVAL',
  'DESENHADA',
  'ESPECIAL',
  'LACRE',
] as const;

export function mergeVocabulario(...listas: Array<readonly string[] | string[] | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const lista of listas) {
    for (const item of lista ?? []) {
      const v = item.trim().toUpperCase();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}
