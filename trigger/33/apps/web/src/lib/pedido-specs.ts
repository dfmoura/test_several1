/** Specs técnicas do snapshot do orçamento para PDF/UI de pedido e OS. */

import type { OrcamentoInputSnapshot } from "@/lib/orcamento-comercial";

export function specsFromInput(
  input: OrcamentoInputSnapshot | null | undefined,
): Array<{ label: string; value: string }> {
  if (!input) return [];
  const rows: Array<{ label: string; value: string | number | null | undefined }> = [
    { label: "Medida", value: input.medida },
    { label: "Papel", value: input.papel },
    { label: "Acabamento", value: input.acabamento },
    { label: "Cores", value: input.cores },
    { label: "Faca / formato", value: input.formatoFaca },
    { label: "Máquina", value: input.maquinaRoda || input.maquinaGrupo },
    { label: "Colunas", value: input.qtdeColunas },
    { label: "Modelos", value: input.qtdeModelos },
    { label: "Etq./rolo", value: input.etiqPorRolo },
    { label: "Tubete", value: input.tubete },
    { label: "Largura papel (cm)", value: input.larguraPapel },
    { label: "Puxada", value: input.puxada },
    { label: "Z", value: input.z },
    { label: "RPM", value: input.rpm },
    { label: "Matriz", value: input.matriz == null ? null : input.matriz ? "SIM" : "NÃO" },
  ];
  return rows
    .filter((r) => r.value != null && String(r.value).trim() !== "")
    .map((r) => ({ label: r.label, value: String(r.value) }));
}
