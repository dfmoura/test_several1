/**
 * Camada 2 de codificação (estudo 32 / CODIFICACAO_INFORMACOES_SISTEMA).
 *
 * Camada 1 = id técnico (cuid) + numero/ano numéricos no banco.
 * Camada 2 = máscara legível para UI, PDF, WhatsApp e suporte.
 *
 * Nunca usar a máscara como FK.
 */

export type PrefixoDocumento =
  | "ORC"
  | "PED"
  | "OP"
  | "OS"
  | "OC"
  | "TIT"
  | "BX"
  | "ENT"
  | "COB"
  | "MOV"
  | "COT"
  | "REM"
  | "RMA"
  | "DEV"
  | "COM"
  | "MSG"
  | "CRT"
  | "BEM"
  | "NAT"
  | "FAC"
  | "EMP"
  | "PAR";

const WIDTH_DOC = 5;
const WIDTH_CADASTRO = 5;

export function padNum(n: number, width = WIDTH_DOC): string {
  const raw = String(Math.trunc(Math.max(0, Number(n) || 0)));
  return raw.length >= width ? raw : raw.padStart(width, "0");
}

/** Documentos anuais: ORC-2026-00123 */
export function formatDocumento(
  prefixo: PrefixoDocumento,
  opts: { ano: number; numero: number; versao?: number | null },
): string {
  const base = `${prefixo}-${opts.ano}-${padNum(opts.numero, WIDTH_DOC)}`;
  if (opts.versao != null && opts.versao > 1) {
    return `${base}-v${opts.versao}`;
  }
  return base;
}

/** Deriva ano da data de criação quando a coluna `ano` ainda não existe. */
export function anoDe(date: Date | string | null | undefined, fallback = new Date().getFullYear()): number {
  if (!date) return fallback;
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  return Number.isFinite(y) ? y : fallback;
}

export function formatOrcamento(o: {
  numero: number;
  versao?: number | null;
  createdAt?: Date | string | null;
  data?: Date | string | null;
  ano?: number | null;
}): string {
  const ano = o.ano ?? anoDe(o.data ?? o.createdAt);
  return formatDocumento("ORC", { ano, numero: o.numero, versao: o.versao });
}

export function formatPedido(p: {
  numero: number;
  createdAt?: Date | string | null;
  ano?: number | null;
}): string {
  return formatDocumento("PED", { ano: p.ano ?? anoDe(p.createdAt), numero: p.numero });
}

export function formatOp(o: {
  numero: number;
  createdAt?: Date | string | null;
  ano?: number | null;
}): string {
  return formatDocumento("OP", { ano: o.ano ?? anoDe(o.createdAt), numero: o.numero });
}

export function formatOs(o: {
  numero: number;
  createdAt?: Date | string | null;
  ano?: number | null;
}): string {
  return formatDocumento("OS", { ano: o.ano ?? anoDe(o.createdAt), numero: o.numero });
}

export function formatOc(o: {
  numero: number;
  createdAt?: Date | string | null;
  ano?: number | null;
}): string {
  return formatDocumento("OC", { ano: o.ano ?? anoDe(o.createdAt), numero: o.numero });
}

export function formatTitulo(t: {
  numero?: number | null;
  createdAt?: Date | string | null;
  ano?: number | null;
  id?: string;
}): string {
  if (t.numero != null) {
    return formatDocumento("TIT", { ano: t.ano ?? anoDe(t.createdAt), numero: t.numero });
  }
  // Fallback estável para títulos legados sem sequencial
  const tip = (t.id || "00000").slice(-5).toUpperCase().replace(/[^A-Z0-9]/g, "0");
  return `TIT-${anoDe(t.createdAt)}-${tip.padStart(5, "0").slice(-5)}`;
}

export function formatBaixa(b: {
  numero: number;
  createdAt?: Date | string | null;
  ano?: number | null;
}): string {
  return formatDocumento("BX", { ano: b.ano ?? anoDe(b.createdAt), numero: b.numero });
}

export function formatEntrega(e: {
  numero?: number | null;
  createdAt?: Date | string | null;
  ano?: number | null;
  id?: string;
}): string {
  if (e.numero != null) {
    return formatDocumento("ENT", { ano: e.ano ?? anoDe(e.createdAt), numero: e.numero });
  }
  const tip = (e.id || "00000").slice(-5).toUpperCase().replace(/[^A-Z0-9]/g, "0");
  return `ENT-${anoDe(e.createdAt)}-${tip.padStart(5, "0").slice(-5)}`;
}

/** Cadastro de parceiro: PAR-00042 (aceita código já com prefixo ou só dígitos). */
export function formatParceiro(codigo: string | null | undefined): string {
  const raw = String(codigo ?? "").trim().toUpperCase();
  if (!raw) return "PAR-00000";
  if (raw.startsWith("PAR-")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return `PAR-${padNum(Number(digits), WIDTH_CADASTRO)}`;
}

/** EMP-00001 */
export function formatEmpresa(codigo: string | null | undefined): string {
  const raw = String(codigo ?? "").trim().toUpperCase();
  if (!raw) return "EMP-00000";
  if (raw.startsWith("EMP-")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return `EMP-${padNum(Number(digits), WIDTH_CADASTRO)}`;
}

/** Label curto de status de crédito (estudo crédito). */
export const CREDITO_FLAG_LABEL: Record<string, string> = {
  OK: "Crédito OK",
  BLOQUEADO: "Bloqueado por crédito",
  AGUARDA_ADIANTAMENTO: "Aguarda adiantamento",
  LIBERADO_MANUAL: "Liberado (financeiro)",
};
