/**
 * Código de cadastro mestre (business key) — padrão ERP.
 *
 * Separado do id técnico (cuid): usado em busca, NF-e, impressos e integração.
 * Padrão vigente: numérico sequencial por empresa (ex.: 0001, 0002).
 * `sku` (opcional) guarda referência semântica de catálogo (ex.: PAPEL-BOPP).
 * Códigos alfanuméricos legados, se existirem, são ignorados na sequência.
 */

import { TipoParceiro, TipoProduto } from "@prisma/client";
import { prisma } from "@/lib/db";

export const CODIGO_MAX_LEN = 40;
export const CODIGO_MIN_LEN = 1;
/** Largura mínima com zeros à esquerda (ordenação lexicográfica = numérica). */
export const CODIGO_SEQ_WIDTH = 4;

/** Apenas dígitos — chave de negócio numérica. */
export const CODIGO_PATTERN = /^\d{1,40}$/;

export type NormalizeCodigoResult =
  | { ok: true; codigo: string }
  | { ok: false; error: string };

/** Formata inteiro positivo como código canônico (zero-pad). */
export function formatCodigoNumerico(n: number): string {
  if (!Number.isFinite(n) || n < 1) {
    return String(1).padStart(CODIGO_SEQ_WIDTH, "0");
  }
  const raw = String(Math.trunc(n));
  return raw.length >= CODIGO_SEQ_WIDTH ? raw : raw.padStart(CODIGO_SEQ_WIDTH, "0");
}

export function isCodigoNumerico(value: string | null | undefined): boolean {
  return CODIGO_PATTERN.test(String(value ?? "").trim());
}

/**
 * Normaliza código de cadastro para forma canônica numérica.
 * "1", "01" e "0001" → "0001". Rejeita letras e símbolos.
 */
export function normalizeCodigo(raw: string | null | undefined): NormalizeCodigoResult {
  const digits = String(raw ?? "")
    .trim()
    .replace(/\D/g, "");

  if (!digits) {
    return { ok: false, error: "Código é obrigatório e deve ser numérico" };
  }
  if (digits.length > CODIGO_MAX_LEN) {
    return { ok: false, error: `Código deve ter no máximo ${CODIGO_MAX_LEN} dígitos` };
  }

  const semZeros = digits.replace(/^0+/, "") || "0";
  if (semZeros === "0") {
    return { ok: false, error: "Código deve ser um número inteiro maior que zero" };
  }
  if (semZeros.length > CODIGO_MAX_LEN) {
    return { ok: false, error: `Código deve ter no máximo ${CODIGO_MAX_LEN} dígitos` };
  }

  const n = Number(semZeros);
  if (!Number.isSafeInteger(n) || n < 1) {
    return { ok: true, codigo: semZeros };
  }

  return { ok: true, codigo: formatCodigoNumerico(n) };
}

/** Próximo código a partir de uma lista (útil em transações Prisma). */
export function proximoCodigoFromList(codigos: Array<string | null | undefined>): string {
  let max = 0;
  for (const raw of codigos) {
    const c = String(raw ?? "").trim();
    if (!CODIGO_PATTERN.test(c)) continue;
    const n = Number(c.replace(/^0+/, "") || "0");
    if (Number.isSafeInteger(n) && n > max) max = n;
  }
  return formatCodigoNumerico(max + 1);
}

/**
 * Próximo número livre na empresa (só considera códigos puramente numéricos).
 */
async function proximoSequencialNumerico(opts: {
  empresaId: string;
  table: "parceiro" | "produto";
}): Promise<string> {
  const rows =
    opts.table === "parceiro"
      ? await prisma.parceiro.findMany({
          where: { empresaId: opts.empresaId },
          select: { codigo: true },
        })
      : await prisma.produto.findMany({
          where: { empresaId: opts.empresaId },
          select: { codigo: true },
        });

  return proximoCodigoFromList(rows.map((r) => r.codigo));
}

export async function sugerirCodigoParceiro(opts: {
  empresaId: string;
  /** Mantido por compatibilidade de API; a sequência é única por empresa. */
  tipos?: TipoParceiro[];
}): Promise<string> {
  return proximoSequencialNumerico({
    empresaId: opts.empresaId,
    table: "parceiro",
  });
}

export async function sugerirCodigoProdutoCadastro(opts: {
  empresaId: string;
  /** Mantido por compatibilidade de API; a sequência é única por empresa. */
  tipo?: TipoProduto;
}): Promise<string> {
  return proximoSequencialNumerico({
    empresaId: opts.empresaId,
    table: "produto",
  });
}

export async function codigoParceiroDisponivel(opts: {
  empresaId: string;
  codigo: string;
  excludeId?: string;
}): Promise<boolean> {
  const found = await prisma.parceiro.findFirst({
    where: {
      empresaId: opts.empresaId,
      codigo: opts.codigo,
      ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}),
    },
    select: { id: true },
  });
  return !found;
}

export async function codigoProdutoDisponivel(opts: {
  empresaId: string;
  codigo: string;
  excludeId?: string;
}): Promise<boolean> {
  const found = await prisma.produto.findFirst({
    where: {
      empresaId: opts.empresaId,
      codigo: opts.codigo,
      ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}),
    },
    select: { id: true },
  });
  return !found;
}
