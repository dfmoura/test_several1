/**
 * Contrato de digitação numérica (UX).
 *
 * Estado visual = string (pode ficar vazio). Conversão / default / min-max
 * só no commit (blur / submit) — nunca `Number(x) || 0` no onChange.
 * Escalas oficiais e payload canônico continuam em `format.ts` / PadraoDecimal.
 */

export type NumericDraftOptions = {
  /** Inteiro (sem separador decimal). */
  integer?: boolean;
  /** Permite sinal negativo. */
  allowNegative?: boolean;
};

/**
 * Mantém só o que o usuário pode digitar (dígitos, um separador, sinal opcional).
 * Não interpreta valor — só filtra teclas/colagem.
 */
export function sanitizeNumericDraft(
  raw: string,
  opts: NumericDraftOptions = {},
): string {
  const allowNeg = opts.allowNegative === true;
  const integer = opts.integer === true;
  let out = '';
  let sawSep = false;
  let sawDigit = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch >= '0' && ch <= '9') {
      out += ch;
      sawDigit = true;
      continue;
    }
    if (!integer && (ch === ',' || ch === '.') && !sawSep) {
      out += ch;
      sawSep = true;
      continue;
    }
    if (allowNeg && ch === '-' && out.length === 0) {
      out += ch;
    }
  }

  // Evita "-" solto virar lixo; dígito após sinal é ok.
  if (out === '-' && !sawDigit) return out;
  return out;
}

/** Interpreta draft. Vazio / incompleto (`-`, `,`, `.`) → null. */
export function parseNumericDraft(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '.' || t === ',') return null;
  if (t.endsWith('.')) {
    const head = t.slice(0, -1);
    if (head === '' || head === '-') return null;
    const n = Number(head);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type CommitNumericDraftOptions = NumericDraftOptions & {
  /** Valor gravado quando o draft está vazio no commit. Default: `''`. */
  emptyCommit?: number | '';
  min?: number;
  max?: number;
};

/** Commit (blur/submit): vazio → emptyCommit; inválido → emptyCommit; senão clamp. */
export function commitNumericDraft(
  raw: string,
  opts: CommitNumericDraftOptions = {},
): number | '' {
  const empty: number | '' = opts.emptyCommit !== undefined ? opts.emptyCommit : '';
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === ',' || trimmed === '.') {
    return empty;
  }

  let n = parseNumericDraft(trimmed);
  if (n == null) return empty;

  if (opts.integer) n = Math.trunc(n);
  if (opts.min != null && n < opts.min) n = opts.min;
  if (opts.max != null && n > opts.max) n = opts.max;
  return n;
}

/** Texto exibido a partir do valor já commitado. */
export function formatNumericCommitted(
  value: number | '' | null | undefined,
  opts?: { blankZero?: boolean },
): string {
  if (value === '' || value == null) return '';
  if (opts?.blankZero && value === 0) return '';
  return String(value);
}
