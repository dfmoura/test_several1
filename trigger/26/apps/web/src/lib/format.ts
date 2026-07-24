export function formatCurrency(cents: number | undefined | null): string {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCurrencyReais(value: number | undefined | null): string {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCnpj(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 14);
  if (d.length !== 14) return digits;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    rascunho: "Rascunho",
    enviado: "Enviado",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    expirado: "Expirado",
    cancelado: "Cancelado",
    aberto: "Aberto",
    em_producao: "Em produção",
    faturado: "Faturado",
    entregue: "Entregue",
    encerrado: "Encerrado",
    planejada: "Planejada",
    liberada: "Liberada",
    em_execucao: "Em execução",
    pausada: "Pausada",
    concluida: "Concluída",
    pendente: "Pendente",
    emitida: "Emitida",
    paga: "Paga",
    vencida: "Vencida",
    aguardando: "Aguardando",
    expedida: "Expedida",
    em_transito: "Em trânsito",
    parcial: "Parcial",
    aberta: "Aberta",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

export function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["aprovado", "concluida", "paga", "entregue", "encerrado"].includes(status)) return "success";
  if (["reprovado", "cancelado", "vencida", "recusada"].includes(status)) return "danger";
  if (["enviado", "em_producao", "em_execucao", "em_transito", "liberada"].includes(status)) return "info";
  if (["rascunho", "planejada", "aguardando", "pendente", "aberto", "aberta"].includes(status)) return "warning";
  return "neutral";
}
