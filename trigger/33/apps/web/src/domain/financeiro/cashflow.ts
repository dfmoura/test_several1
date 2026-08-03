/**
 * Fluxo de caixa projetado — entradas (AR) e saídas (AP) por dia.
 */

export type CashflowEvent = {
  data: string; // YYYY-MM-DD
  tipo: "entrada" | "saida";
  valor: number;
  origem: "receber" | "pagar";
  referencia: string;
};

export type CashflowDay = {
  data: string;
  entradas: number;
  saidas: number;
  liquido: number;
  acumulado: number;
};

export type CashflowProjection = {
  saldoInicial: number;
  dias: CashflowDay[];
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
};

function toIsoDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return toIsoDate(dt);
}

/**
 * Projeta caixa diário a partir de títulos abertos + saldo bancário atual.
 * Títulos vencidos entram no dia 0 (hoje) como pendência imediata.
 */
export function projetarFluxoCaixa(opts: {
  saldoInicial: number;
  hoje?: Date;
  horizonteDias?: number;
  entradas: Array<{ vencimento: Date | string; valorAberto: number; referencia: string }>;
  saidas: Array<{ vencimento: Date | string; valorAberto: number; referencia: string }>;
}): CashflowProjection {
  const hoje = opts.hoje ?? new Date();
  const horizonte = opts.horizonteDias ?? 30;
  const hojeIso = toIsoDate(hoje);
  const fimIso = addDays(hojeIso, horizonte - 1);

  const byDay = new Map<string, { entradas: number; saidas: number }>();
  for (let i = 0; i < horizonte; i++) {
    byDay.set(addDays(hojeIso, i), { entradas: 0, saidas: 0 });
  }

  const bucketDate = (venc: Date | string): string => {
    const iso = toIsoDate(venc);
    if (iso < hojeIso) return hojeIso;
    if (iso > fimIso) return fimIso;
    return iso;
  };

  for (const e of opts.entradas) {
    if (e.valorAberto <= 0) continue;
    const key = bucketDate(e.vencimento);
    const slot = byDay.get(key);
    if (slot) slot.entradas += e.valorAberto;
  }
  for (const s of opts.saidas) {
    if (s.valorAberto <= 0) continue;
    const key = bucketDate(s.vencimento);
    const slot = byDay.get(key);
    if (slot) slot.saidas += s.valorAberto;
  }

  let acumulado = opts.saldoInicial;
  let totalEntradas = 0;
  let totalSaidas = 0;
  const dias: CashflowDay[] = [];

  for (let i = 0; i < horizonte; i++) {
    const data = addDays(hojeIso, i);
    const slot = byDay.get(data)!;
    const entradas = Math.round(slot.entradas * 100) / 100;
    const saidas = Math.round(slot.saidas * 100) / 100;
    const liquido = Math.round((entradas - saidas) * 100) / 100;
    acumulado = Math.round((acumulado + liquido) * 100) / 100;
    totalEntradas += entradas;
    totalSaidas += saidas;
    dias.push({ data, entradas, saidas, liquido, acumulado });
  }

  return {
    saldoInicial: opts.saldoInicial,
    dias,
    totalEntradas: Math.round(totalEntradas * 100) / 100,
    totalSaidas: Math.round(totalSaidas * 100) / 100,
    saldoFinal: acumulado,
  };
}
