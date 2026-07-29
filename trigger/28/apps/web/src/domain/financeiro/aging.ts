/**
 * Aging de títulos (AR/AP) — buckets padrão de tesouraria ERP.
 */

export type AgingBucketId =
  | "a_vencer"
  | "0_7"
  | "8_15"
  | "16_30"
  | "31_60"
  | "60_mais";

export type AgingBucket = {
  id: AgingBucketId;
  label: string;
  quantidade: number;
  valor: number;
};

export type AgingTitulo = {
  valorAberto: number;
  vencimento: Date | string;
};

const BUCKET_DEFS: { id: AgingBucketId; label: string }[] = [
  { id: "a_vencer", label: "A vencer" },
  { id: "0_7", label: "1–7 dias" },
  { id: "8_15", label: "8–15 dias" },
  { id: "16_30", label: "16–30 dias" },
  { id: "31_60", label: "31–60 dias" },
  { id: "60_mais", label: "60+ dias" },
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Dias de atraso (negativo = a vencer). */
export function diasAtraso(vencimento: Date | string, hoje = new Date()): number {
  const v = startOfDay(typeof vencimento === "string" ? new Date(vencimento) : vencimento);
  const h = startOfDay(hoje);
  return Math.floor((h.getTime() - v.getTime()) / 86400000);
}

export function bucketForDias(dias: number): AgingBucketId {
  if (dias <= 0) return "a_vencer";
  if (dias <= 7) return "0_7";
  if (dias <= 15) return "8_15";
  if (dias <= 30) return "16_30";
  if (dias <= 60) return "31_60";
  return "60_mais";
}

export function buildAging(titulos: AgingTitulo[], hoje = new Date()): AgingBucket[] {
  const map = new Map<AgingBucketId, { quantidade: number; valor: number }>();
  for (const def of BUCKET_DEFS) {
    map.set(def.id, { quantidade: 0, valor: 0 });
  }
  for (const t of titulos) {
    if (t.valorAberto <= 0) continue;
    const id = bucketForDias(diasAtraso(t.vencimento, hoje));
    const slot = map.get(id)!;
    slot.quantidade += 1;
    slot.valor += t.valorAberto;
  }
  return BUCKET_DEFS.map((def) => {
    const s = map.get(def.id)!;
    return {
      id: def.id,
      label: def.label,
      quantidade: s.quantidade,
      valor: Math.round(s.valor * 100) / 100,
    };
  });
}
