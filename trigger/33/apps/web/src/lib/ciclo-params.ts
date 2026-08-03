/** Parâmetros e helpers do ciclo operacional. */

import { prisma } from "@/lib/db";

export const PARAM_KEYS = {
  depositoPadrao: "estoque.depositoPadraoCodigo",
  reservaNaConfirmacao: "mrp.reservaNaConfirmacao",
  percentualMinimoLiberacaoOs: "mrp.percentualMinimoLiberacaoOs",
  exigeOsConcluida: "faturamento.exigeOsConcluida",
  documentoPadrao: "faturamento.documentoPadrao",
  /**
   * @deprecated Estudo 32: etiqueta = NF-e produção (não dual).
   * Mantido só para leitura de parâmetros legados; default false.
   */
  dualFiscal: "faturamento.dualFiscal",
  toleranciaQtdPct: "compra.toleranciaQtdPct",
  toleranciaValorPct: "compra.toleranciaValorPct",
  liquidacaoExigeEntrega: "pedido.liquidacaoExigeEntrega",
  /** Spec 32: NF antes de expedir (PARAMETROS_EMPRESA_OFICIAIS). */
  nfAntesDeExpedir: "pedido.nfAntesDeExpedir",
  /** Sinal % para cliente novo / limite 0. */
  creditoSinalPctNovoCliente: "credito.sinalPctNovoCliente",
  creditoToleranciaAtrasoDias: "credito.toleranciaAtrasoDias",
  /** Mínimo de metros para retalho voltar ao estoque. */
  sobraComprimentoMinimoM: "estoque.sobraComprimentoMinimoM",
  sobraPctMesmoSku: "estoque.sobraPctMesmoSku",
  /** Exige aceite do cliente pelo link para gerar PED (HML: true). */
  exigeAceiteLinkCliente: "orcamento.exigeAceiteLinkCliente",
} as const;

const DEFAULTS: Record<string, unknown> = {
  [PARAM_KEYS.depositoPadrao]: "PRINCIPAL",
  [PARAM_KEYS.reservaNaConfirmacao]: true,
  [PARAM_KEYS.percentualMinimoLiberacaoOs]: 100,
  [PARAM_KEYS.exigeOsConcluida]: true,
  /** Estudo 32: produção própria → NF-e (PA-ETQ, CFOP 5101/6101). */
  [PARAM_KEYS.documentoPadrao]: "NFE",
  [PARAM_KEYS.dualFiscal]: false,
  [PARAM_KEYS.toleranciaQtdPct]: 5,
  [PARAM_KEYS.toleranciaValorPct]: 2,
  [PARAM_KEYS.liquidacaoExigeEntrega]: false,
  [PARAM_KEYS.nfAntesDeExpedir]: true,
  [PARAM_KEYS.creditoSinalPctNovoCliente]: 50,
  [PARAM_KEYS.creditoToleranciaAtrasoDias]: 7,
  [PARAM_KEYS.sobraComprimentoMinimoM]: 100,
  [PARAM_KEYS.sobraPctMesmoSku]: 80,
  [PARAM_KEYS.exigeAceiteLinkCliente]: true,
};

export async function getParametro<T>(chave: string, fallback?: T): Promise<T> {
  const row = await prisma.parametroSistema.findUnique({ where: { chave } });
  if (row == null) {
    return (fallback !== undefined ? fallback : DEFAULTS[chave]) as T;
  }
  return row.valor as T;
}

export async function ensureDepositoPadrao(empresaId: string) {
  const codigo = await getParametro<string>(PARAM_KEYS.depositoPadrao, "PRINCIPAL");
  const existing = await prisma.deposito.findUnique({
    where: { empresaId_codigo: { empresaId, codigo } },
  });
  if (existing) {
    if (!existing.padrao) {
      await prisma.deposito.update({ where: { id: existing.id }, data: { padrao: true } });
    }
    return existing;
  }
  await prisma.deposito.updateMany({
    where: { empresaId, padrao: true },
    data: { padrao: false },
  });
  return prisma.deposito.create({
    data: {
      empresaId,
      codigo,
      nome: "Depósito principal",
      padrao: true,
      ativo: true,
    },
  });
}

export function dec(n: unknown): number {
  if (n == null) return 0;
  if (typeof n === "number") return n;
  if (typeof n === "string") return Number(n) || 0;
  if (typeof n === "object" && n !== null && "toNumber" in n) {
    return (n as { toNumber: () => number }).toNumber();
  }
  return Number(n) || 0;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
