import { ceiling } from "./math";
import {
  CatalogLookups,
  CoresValue,
  DEFAULT_PARAMS,
  FaixaCosts,
  FaixaProduction,
  FaixaResult,
  PricingParams,
  QuoteInput,
  QuoteResult,
} from "./types";

function coresKey(cores: CoresValue): string {
  return String(cores);
}

function numCoresParaMatriz(cores: CoresValue): number {
  if (cores === "4V") return 4;
  return Number(cores);
}

/**
 * Perda acerto (papel) — espelha fórmula I13 da planilha.
 */
export function calcularPerdaAcerto(
  cores: CoresValue,
  larguraPapel: number,
  lookups: CatalogLookups,
  params: PricingParams,
): number {
  const key = coresKey(cores);
  if (cores === 0 || cores === 1 || cores === 2 || cores === 3) {
    const fixo = lookups.perdaPapelFixoM2[key];
    if (fixo === undefined) {
      throw new Error(`Perda de papel não cadastrada para cores=${key}`);
    }
    return fixo;
  }
  if (cores === 4) {
    return ((larguraPapel + 1) / 100) * params.perdaCores4Fator;
  }
  if (cores === "4V" || cores === 5) {
    return (larguraPapel / 100) * 250;
  }
  if (cores === 6) return (larguraPapel / 100) * 260;
  if (cores === 7) return (larguraPapel / 100) * 270;
  if (cores === 8) return (larguraPapel / 100) * 280;
  throw new Error(`Cores inválidas: ${String(cores)}`);
}

/**
 * Valor matriz (clichê) — fórmula MATRIZ!E3.
 * largura_matriz = largura_papel * qtde_colunas
 */
export function calcularValorMatriz(
  z: number,
  larguraPapel: number,
  qtdeColunas: number,
  cores: CoresValue,
  params: PricingParams,
): number {
  const larguraMatriz = larguraPapel * qtdeColunas;
  const qCores = numCoresParaMatriz(cores);
  return ((((z * 3.175) / 10) + 4) * (larguraMatriz + 4) * qCores) * params.valorCm2Matriz;
}

function lookupTarifa(
  maquinaGrupo: string,
  cores: CoresValue,
  lookups: CatalogLookups,
): number {
  const grupo = lookups.tarifaHora[maquinaGrupo];
  if (!grupo) {
    throw new Error(`Grupo de máquina desconhecido: ${maquinaGrupo}`);
  }
  const tarifa = grupo[coresKey(cores)];
  if (tarifa === undefined) {
    throw new Error(`Tarifa hora não encontrada: grupo=${maquinaGrupo} cores=${coresKey(cores)}`);
  }
  return tarifa;
}

function lookupCaixas(
  tubete: string,
  qtdeRolos: number,
  lookups: CatalogLookups,
): number {
  // Planilha: VLOOKUP(CONCATENATE(tubete & rolos), ...)
  // Excel concatena número sem decimais se inteiro: 3"10
  const rolosKey = Number.isInteger(qtdeRolos) ? String(qtdeRolos) : String(qtdeRolos);
  const key = `${tubete}${rolosKey}`;
  const found = lookups.caixasPorTubeteRolos[key];
  if (found === undefined) {
    // Fallback algorítmico documentado (TODO negócio se divergir):
    // capacidade observada 3": 12 rolos/caixa
    const capacidade = tubete.includes('1"') && !tubete.includes("1/2") && !tubete.includes("3")
      ? 24
      : tubete.includes("1/2")
        ? 18
        : 12;
    return Math.max(1, Math.ceil(qtdeRolos / capacidade));
  }
  return found;
}

function calcProduction(
  input: QuoteInput,
  faixa: { quantidade: number; tipoParada: string },
  lookups: CatalogLookups,
  params: PricingParams,
): FaixaProduction {
  const Q = faixa.quantidade;
  const metragemLinear = (input.puxada / 100) * Q / input.qtdeColunas;
  const horaMaquina = metragemLinear / input.rpm + 1;
  const tempoParada = lookups.tempoParadaH[faixa.tipoParada];
  if (tempoParada === undefined) {
    throw new Error(`Tipo de parada desconhecido: ${faixa.tipoParada}`);
  }
  const horaTrocaProduto = tempoParada * (input.qtdeModelos - 1);

  let horaTrocaBobina = 0;
  if (metragemLinear >= params.tetoMetragemTrocaBobina) {
    horaTrocaBobina =
      ((metragemLinear / 1000) - 1) * params.minutosTrocaBobina / 60;
  }

  const metragemM2 = ceiling((Q * input.larguraPapel * input.puxada) / 10000, 0.1);
  const perdaAcerto = calcularPerdaAcerto(input.cores, input.larguraPapel, lookups, params);
  const perdaAcabamento = lookups.perdaAcabamentoM2[input.acabamento];
  if (perdaAcabamento === undefined) {
    throw new Error(`Acabamento sem perda cadastrada: ${input.acabamento}`);
  }

  let perdaTrocaBobinaM2 = 0;
  if (metragemLinear > params.tetoMetragemTrocaBobina) {
    perdaTrocaBobinaM2 =
      (5 * (input.larguraPapel - 0.75) * input.qtdeColunas / 100) *
      (metragemLinear / 1000);
  }

  const qtdeRolos = Q / input.etiqPorRolo;
  const qtdeCaixas = lookupCaixas(input.tubete, qtdeRolos, lookups);

  return {
    quantidade: Q,
    tipoParada: faixa.tipoParada,
    horaMaquina,
    horaTrocaProduto,
    horaTrocaBobina,
    metragemLinear,
    metragemM2,
    perdaAcerto,
    perdaAcabamento,
    perdaTrocaBobinaM2,
    qtdeRolos,
    qtdeCaixas,
  };
}

function calcCosts(
  input: QuoteInput,
  prod: FaixaProduction,
  lookups: CatalogLookups,
  params: PricingParams,
): FaixaCosts {
  const precoPapel = lookups.precoPapelM2[input.papel];
  if (precoPapel === undefined) throw new Error(`Papel não cadastrado: ${input.papel}`);
  const precoAcab = lookups.precoAcabamentoM2[input.acabamento];
  if (precoAcab === undefined) throw new Error(`Acabamento não cadastrado: ${input.acabamento}`);
  const precoTubete = lookups.precoTubete[input.tubete];
  if (precoTubete === undefined) throw new Error(`Tubete não cadastrado: ${input.tubete}`);

  const tarifa = lookupTarifa(input.maquinaGrupo, input.cores, lookups);

  const valorPapel =
    (prod.metragemM2 + prod.perdaAcerto + prod.perdaTrocaBobinaM2) * precoPapel;
  const valorMaquina = prod.horaMaquina * tarifa;
  const valorTrocaProduto = prod.horaTrocaProduto * tarifa;
  const valorTrocaBobina = prod.horaTrocaBobina * tarifa;

  let tinta = 0;
  if (input.cores !== 0) {
    const baseTinta = prod.metragemM2 + prod.perdaAcerto;
    if (baseTinta <= params.tintaLimiteM2) {
      tinta = numCoresParaMatriz(input.cores) * params.tintaPrecoAbaixo;
      // Planilha: $E$8*10 — usa valor de cores (4V seria problema; golden usa numérico)
      if (typeof input.cores === "number") {
        tinta = input.cores * params.tintaPrecoAbaixo;
      }
    } else {
      tinta = baseTinta * params.tintaPrecoM2Acima;
    }
  }

  const acabamento =
    precoAcab * (prod.metragemM2 + prod.perdaAcerto + prod.perdaAcabamento);
  const rebobinacao =
    ((prod.metragemLinear * input.qtdeColunas) / input.colunaRebobinacao / 1000) *
    params.precoRebobinacao;
  const tubete = prod.qtdeRolos * precoTubete;
  const valorCaixa = prod.qtdeCaixas * params.precoCaixa;

  const valorServico =
    valorPapel +
    valorMaquina +
    valorTrocaProduto +
    valorTrocaBobina +
    tinta +
    acabamento +
    rebobinacao +
    tubete +
    valorCaixa;

  return {
    valorPapel,
    valorMaquina,
    valorTrocaProduto,
    valorTrocaBobina,
    tinta,
    acabamento,
    rebobinacao,
    tubete,
    valorCaixa,
    valorServico,
  };
}

function buildAlerts(input: QuoteInput): string[] {
  const alerts: string[] = [];
  if (input.cores === 0) alerts.push("Cores = 0 (serviço sem impressão)");
  if (input.matriz && (input.z === null || input.z < 1)) {
    alerts.push("Matriz=SIM mas Z inválido — valor matriz zerado");
  }
  for (const f of input.faixas) {
    const ml = (input.puxada / 100) * f.quantidade / input.qtdeColunas;
    if (ml < 100) alerts.push(`Faixa ${f.quantidade}: metragem linear baixa (${ml.toFixed(1)} m)`);
  }
  return alerts;
}

/**
 * Motor puro: calcula orçamento completo a partir de inputs + lookups + params.
 * Sem I/O, sem UI — determinístico e testável.
 */
export function calculateQuote(
  input: QuoteInput,
  lookups: CatalogLookups,
  params: PricingParams = DEFAULT_PARAMS,
): QuoteResult {
  if (!input.faixas.length) {
    throw new Error("Informe ao menos uma faixa de quantidade");
  }

  let valorMatrizBruto = 0;
  if (input.matriz && input.z !== null && input.z >= 1) {
    valorMatrizBruto = calcularValorMatriz(
      input.z,
      input.larguraPapel,
      input.qtdeColunas,
      input.cores,
      params,
    );
  }
  const valorMatrizApresentado = input.matriz
    ? ceiling(valorMatrizBruto, params.arredondamentoMatriz)
    : 0;

  const faixas: FaixaResult[] = input.faixas.map((f) => {
    const production = calcProduction(input, f, lookups, params);
    const costs = calcCosts(input, production, lookups, params);
    const comissao = costs.valorServico * (input.comissaoPct / 100);
    const imposto = costs.valorServico * (input.impostoPct / 100);
    const servicoEncargos = costs.valorServico + comissao + imposto;
    const valorEtiqueta = ceiling(servicoEncargos, params.arredondamentoEtiqueta);
    return {
      production,
      costs,
      commercial: {
        comissao,
        imposto,
        servicoEncargos,
        valorEtiqueta,
        valorMatriz: valorMatrizApresentado,
        valorTotal: valorEtiqueta + valorMatrizApresentado,
      },
    };
  });

  return {
    valorMatrizBruto,
    faixas,
    alerts: buildAlerts(input),
  };
}

export type { FaixaCosts, FaixaProduction };
