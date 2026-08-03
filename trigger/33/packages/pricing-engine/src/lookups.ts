import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogLookups, PricingParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve caminho dos catálogos extraídos da planilha. */
export function catalogsDir(from = __dirname): string {
  // packages/pricing-engine/src → ../../data/catalogs
  return join(from, "../../../data/catalogs");
}

function loadJson<T>(file: string): T {
  const path = join(catalogsDir(), file);
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/**
 * Monta lookups a partir dos JSONs extraídos do XLSM.
 * Em produção a API monta a partir do PostgreSQL.
 */
export function loadLookupsFromFiles(): CatalogLookups {
  const papeis = loadJson<Array<{ nome: string; preco_m2: number }>>("papeis.json");
  const acabamentos = loadJson<Array<{ nome: string; preco_m2: number }>>("acabamentos.json");
  const perdaAcab = loadJson<Record<string, number>>("perda_acabamento.json");
  const tubetes = loadJson<Array<{ tamanho: string; preco: number }>>("tubetes.json");
  const paradas = loadJson<Array<{ tipo: string; tempo_h: number }>>("hora_parada.json");
  const perdaPapel = loadJson<{
    fixos: Record<string, { m2_fixo: number | null }>;
    fator_cores4: number;
  }>("perda_papel.json");
  const horaMaq = loadJson<Record<string, Record<string, number>>>("hora_maquina.json");
  const caixas = loadJson<Record<string, number>>("caixas.json");

  const perdaPapelFixoM2: Record<string, number> = {};
  for (const [k, v] of Object.entries(perdaPapel.fixos)) {
    if (v.m2_fixo != null) perdaPapelFixoM2[k] = Number(v.m2_fixo);
  }

  return {
    precoPapelM2: Object.fromEntries(papeis.map((p) => [p.nome, p.preco_m2])),
    precoAcabamentoM2: Object.fromEntries(acabamentos.map((a) => [a.nome, a.preco_m2])),
    perdaAcabamentoM2: perdaAcab,
    precoTubete: Object.fromEntries(tubetes.map((t) => [t.tamanho, t.preco])),
    tempoParadaH: Object.fromEntries(paradas.map((p) => [p.tipo, p.tempo_h])),
    perdaPapelFixoM2,
    tarifaHora: horaMaq,
    caixasPorTubeteRolos: caixas,
  };
}

export function loadParamsFromFiles(): PricingParams {
  const raw = loadJson<{
    preco_caixa: number;
    valor_cm2_matriz: number;
    minutos_troca_bobina: number;
    teto_metragem_troca_bobina: number;
    arredondamento_etiqueta: number;
    arredondamento_matriz: number;
    rebobinacao_preco: number;
  }>("parametros.json");
  const tinta = loadJson<{
    limite_m2: number;
    preco_abaixo: number;
    preco_m2_acima: number;
  }>("tinta.json");
  const perdaPapel = loadJson<{ fator_cores4: number }>("perda_papel.json");

  return {
    ...DEFAULT_PARAMS,
    precoCaixa: raw.preco_caixa,
    valorCm2Matriz: raw.valor_cm2_matriz,
    minutosTrocaBobina: raw.minutos_troca_bobina,
    tetoMetragemTrocaBobina: raw.teto_metragem_troca_bobina,
    arredondamentoEtiqueta: raw.arredondamento_etiqueta,
    arredondamentoMatriz: raw.arredondamento_matriz,
    precoRebobinacao: raw.rebobinacao_preco,
    tintaLimiteM2: tinta.limite_m2,
    tintaPrecoAbaixo: tinta.preco_abaixo,
    tintaPrecoM2Acima: tinta.preco_m2_acima,
    perdaCores4Fator: perdaPapel.fator_cores4,
  };
}
