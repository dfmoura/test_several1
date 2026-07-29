/** Normalização e formatação de CNAE (7 dígitos → 0000-0/00). */

export type CnaeInfo = {
  /** Só dígitos (7). */
  codigo: string;
  /** Máscara oficial 0000-0/00. */
  codigoFormatado: string;
  descricao: string | null;
};

export function normalizeCnaeCodigo(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 0) return null;
  return digits.padStart(7, "0").slice(0, 7);
}

/** Formata CNAE 7 dígitos como 1813-0/99. */
export function formatCnae(value: string | number | null | undefined): string {
  const d = normalizeCnaeCodigo(value);
  if (!d || d.length !== 7) return value != null ? String(value) : "";
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`;
}

export function toCnaeInfo(
  codigo: string | number | null | undefined,
  descricao?: string | null,
): CnaeInfo | null {
  const c = normalizeCnaeCodigo(codigo);
  if (!c) return null;
  const desc = descricao?.trim() || null;
  return {
    codigo: c,
    codigoFormatado: formatCnae(c),
    descricao: desc,
  };
}
