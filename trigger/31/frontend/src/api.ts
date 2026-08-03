import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export const fmtMoney = (v: number | null | undefined) =>
  v == null
    ? "-"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtQty = (v: number | null | undefined, digits = 2) =>
  v == null ? "-" : v.toLocaleString("pt-BR", { maximumFractionDigits: digits });

export const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v + (v.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "-";

export const fmtDateTime = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString("pt-BR") : "-";

export const fmtCnpj = (v: string | null | undefined) =>
  v && v.length === 14
    ? `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`
    : v ?? "-";

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join("; ");
  }
  return "Erro inesperado. Tente novamente.";
}
