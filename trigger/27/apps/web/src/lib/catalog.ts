import {
  type CatalogLookups,
  type PricingParams,
  DEFAULT_PARAMS,
} from "@orcamento/pricing-engine";
import { prisma } from "./db";

export async function loadLookupsFromDb(): Promise<CatalogLookups> {
  const [papeis, acabamentos, tubetes, paradas, tarifas, perdas, caixas] =
    await Promise.all([
      prisma.papel.findMany({ where: { ativo: true } }),
      prisma.acabamento.findMany({ where: { ativo: true } }),
      prisma.tubete.findMany({ where: { ativo: true } }),
      prisma.horaParada.findMany({ where: { ativo: true } }),
      prisma.horaMaquinaTarifa.findMany(),
      prisma.perdaPapel.findMany(),
      prisma.caixaLookup.findMany(),
    ]);

  const tarifaHora: Record<string, Record<string, number>> = {};
  for (const t of tarifas) {
    tarifaHora[t.grupo] ??= {};
    tarifaHora[t.grupo][t.cores] = Number(t.tarifa);
  }

  const perdaPapelFixoM2: Record<string, number> = {};
  for (const p of perdas) {
    if (p.m2Fixo != null) perdaPapelFixoM2[p.cores] = Number(p.m2Fixo);
  }

  return {
    precoPapelM2: Object.fromEntries(papeis.map((p) => [p.nome, Number(p.precoM2)])),
    precoAcabamentoM2: Object.fromEntries(
      acabamentos.map((a) => [a.nome, Number(a.precoM2)]),
    ),
    perdaAcabamentoM2: Object.fromEntries(
      acabamentos.map((a) => [a.nome, Number(a.perdaM2)]),
    ),
    precoTubete: Object.fromEntries(tubetes.map((t) => [t.tamanho, Number(t.preco)])),
    tempoParadaH: Object.fromEntries(paradas.map((p) => [p.tipo, Number(p.tempoH)])),
    perdaPapelFixoM2,
    tarifaHora,
    caixasPorTubeteRolos: Object.fromEntries(caixas.map((c) => [c.chave, c.qtdeCaixas])),
  };
}

export async function loadParamsFromDb(): Promise<PricingParams> {
  const row = await prisma.parametroSistema.findUnique({ where: { chave: "geral" } });
  if (!row) return DEFAULT_PARAMS;
  const v = row.valor as Record<string, unknown>;
  const tinta = (v.tinta as Record<string, number>) || {};
  return {
    ...DEFAULT_PARAMS,
    precoCaixa: Number(v.preco_caixa ?? DEFAULT_PARAMS.precoCaixa),
    valorCm2Matriz: Number(v.valor_cm2_matriz ?? DEFAULT_PARAMS.valorCm2Matriz),
    minutosTrocaBobina: Number(v.minutos_troca_bobina ?? DEFAULT_PARAMS.minutosTrocaBobina),
    tetoMetragemTrocaBobina: Number(
      v.teto_metragem_troca_bobina ?? DEFAULT_PARAMS.tetoMetragemTrocaBobina,
    ),
    arredondamentoEtiqueta: Number(
      v.arredondamento_etiqueta ?? DEFAULT_PARAMS.arredondamentoEtiqueta,
    ),
    arredondamentoMatriz: Number(
      v.arredondamento_matriz ?? DEFAULT_PARAMS.arredondamentoMatriz,
    ),
    precoRebobinacao: Number(v.rebobinacao_preco ?? DEFAULT_PARAMS.precoRebobinacao),
    tintaLimiteM2: Number(tinta.limite_m2 ?? DEFAULT_PARAMS.tintaLimiteM2),
    tintaPrecoAbaixo: Number(tinta.preco_abaixo ?? DEFAULT_PARAMS.tintaPrecoAbaixo),
    tintaPrecoM2Acima: Number(tinta.preco_m2_acima ?? DEFAULT_PARAMS.tintaPrecoM2Acima),
  };
}

export async function writeAudit(opts: {
  entityType: string;
  entityId: string;
  action: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: string;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: opts.entityType,
      entityId: opts.entityId,
      action: opts.action,
      field: opts.field,
      oldValue: opts.oldValue as object | undefined,
      newValue: opts.newValue as object | undefined,
      userId: opts.userId,
    },
  });
}
