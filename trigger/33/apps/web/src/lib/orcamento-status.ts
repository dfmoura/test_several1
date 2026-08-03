import type { OrcamentoStatus } from "@prisma/client";

/** Status em que o orçamento ainda aguarda decisão comercial. */
export const STATUS_PENDENTES: OrcamentoStatus[] = ["RASCUNHO", "ENVIADO", "VISUALIZADO"];

/** Status finais — orçamento imutável (sem editar/excluir). */
export const STATUS_DECIDIDOS: OrcamentoStatus[] = ["APROVADO", "REPROVADO", "PERDIDO"];

export const STATUS_LABEL: Record<OrcamentoStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Aguardando aprovação",
  VISUALIZADO: "Visualizado pelo cliente",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  PERDIDO: "Reprovado",
};

export const STATUS_CHIP_CLASS: Record<OrcamentoStatus, string> = {
  RASCUNHO: "chip-status-rascunho",
  ENVIADO: "chip-status-enviado",
  VISUALIZADO: "chip-status-enviado",
  APROVADO: "chip-status-aprovado",
  REPROVADO: "chip-status-reprovado",
  PERDIDO: "chip-status-reprovado",
};

/** Editável/excluível apenas enquanto aguarda aprovação ou reprovação. */
export function isOrcamentoMutavel(status: OrcamentoStatus): boolean {
  return STATUS_PENDENTES.includes(status);
}

export function isOrcamentoDecidido(status: OrcamentoStatus): boolean {
  return STATUS_DECIDIDOS.includes(status);
}

export function normalizeStatusDecisao(
  status: OrcamentoStatus,
): "APROVADO" | "REPROVADO" | null {
  if (status === "APROVADO") return "APROVADO";
  if (status === "REPROVADO" || status === "PERDIDO") return "REPROVADO";
  return null;
}

export function assertOrcamentoMutavel(status: OrcamentoStatus): void {
  if (!isOrcamentoMutavel(status)) {
    throw Object.assign(
      new Error(
        `Orçamento ${STATUS_LABEL[status].toLowerCase()} não pode ser editado ou excluído`,
      ),
      { status: 409, code: "ORCAMENTO_IMUTAVEL" },
    );
  }
}
