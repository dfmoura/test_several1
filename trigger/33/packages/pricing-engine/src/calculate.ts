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

function capacidadeRolosPorCaixa(tubete: string): number {
  // Referência MEDIDA_CAIXAS (estilo 29): 1"→20, 3"→12
  if (tubete.includes('1"') && !tubete.includes("1/2") && !tubete.includes("3")) {
    return 20;
  }
  if (tubete.includes("1/2")) return 18;
  return 12;
}

function lookupCaixas(
  tubete: string,
  qtdeRolos: number,
  lookups: CatalogLookups,
): number {
  const rolosKey = Number.isInteger(qtdeRolos) ? String(qtdeRolos) : String(qtdeRolos);
  const key = `${tubete}${rolosKey}`;
  const found = lookups.caixasPorTubeteRolos[key];
  if (found === undefined) {
    const capacidade = capacidadeRolosPorCaixa(tubete);
    return Math.max(1, Math.ceil(qtdeRolos / capacidade));
  }
  return found;
}

function resolvePrecoPapel(input: QuoteInput, lookups: CatalogLookups): number {
  const ov = input.overrides?.papelM2;
  if (ov != null && Number.isFinite(ov) && ov > 0) return ov;
  const precoPapel = lookups.precoPapelM2[input.papel];
  if (precoPapel === undefined) throw new Error(`Papel não cadastrado: ${input.papel}`);
  return precoPapel;
}

function resolveTintaAcima(input: QuoteInput, params: PricingParams): number {
  const ov = input.overrides?.tintaAcimaM2;
  if (ov != null && Number.isFinite(ov) && ov >= 0) return ov;
  return params.tintaPrecoM2Acima;
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
  const perdaPapelTrocaProduto = perdaAcerto * input.qtdeModelos;

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
    perdaPapelTrocaProduto,
    perdaTrocaBobinaM2,
    qtdeRolos,
    qtdeCaixas,
    rolosPorCaixa: capacidadeRolosPorCaixa(input.tubete),
  };
}

function calcCosts(
  input: QuoteInput,
  prod: FaixaProduction,
  lookups: CatalogLookups,
  params: PricingParams,
): FaixaCosts {
  const precoPapel = resolvePrecoPapel(input, lookups);
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
  const valorPapelTrocaProduto = prod.perdaPapelTrocaProduto * precoPapel;

  let tinta = 0;
  if (input.cores !== 0) {
    const baseTinta = prod.metragemM2 + prod.perdaAcerto;
    if (baseTinta <= params.tintaLimiteM2) {
      tinta = numCoresParaMatriz(input.cores) * params.tintaPrecoAbaixo;
      if (typeof input.cores === "number") {
        tinta = input.cores * params.tintaPrecoAbaixo;
      }
    } else {
      tinta = baseTinta * resolveTintaAcima(input, params);
    }
  }

  const acabamento =
    precoAcab * (prod.metragemM2 + prod.perdaAcerto + prod.perdaAcabamento);
  const rebobinacao =
    ((prod.metragemLinear * input.qtdeColunas) / input.colunaRebobinacao / 1000) *
    params.precoRebobinacao;
  const tubete = prod.qtdeRolos * precoTubete;
  const valorCaixa = prod.qtdeCaixas * params.precoCaixa;

  // fidelidade golden XLSM legado: valorPapelTrocaProduto NÃO entra no serviço
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
    valorPapelTrocaProduto,
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
  if (input.matriz && !input.matrizJaCobrada && (input.z === null || input.z < 1)) {
    alerts.push("Matriz=SIM mas Z inválido — valor matriz zerado");
  }
  if (input.matriz && input.matrizJaCobrada) {
    alerts.push("Matriz marcada como já cobrada — valor zerado neste pedido");
  }
  if (input.overrides?.papelM2 != null) {
    alerts.push(`Override papel R$/m² = ${input.overrides.papelM2}`);
  }
  if (input.overrides?.tintaAcimaM2 != null) {
    alerts.push(`Override tinta >30 m² = ${input.overrides.tintaAcimaM2}`);
  }
  for (const f of input.faixas) {
    const ml = (input.puxada / 100) * f.quantidade / input.qtdeColunas;
    if (ml < 100) alerts.push(`Faixa ${f.quantidade}: metragem linear baixa (${ml.toFixed(1)} m)`);
    if (ml < 1000 && ml >= 100) {
      alerts.push(`Faixa ${f.quantidade}: metragem < 1000 m — sem troca de bobina`);
    }
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
  const matrizCobrada = Boolean(input.matriz) && !input.matrizJaCobrada;
  const valorMatrizApresentado = matrizCobrada
    ? ceiling(valorMatrizBruto, params.arredondamentoMatriz)
    : 0;

  const faixas: FaixaResult[] = input.faixas.map((f) => {
    const production = calcProduction(input, f, lookups, params);
    const costs = calcCosts(input, production, lookups, params);
    const comissaoPct = f.comissaoPct ?? input.comissaoPct;
    const comissao = costs.valorServico * (comissaoPct / 100);
    const imposto = costs.valorServico * (input.impostoPct / 100);
    const servicoEncargos = costs.valorServico + comissao + imposto;
    const valorEtiqueta = ceiling(servicoEncargos, params.arredondamentoEtiqueta);
    return {
      production,
      costs,
      commercial: {
        comissaoPct,
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
    valorMatriz: valorMatrizApresentado,
    matrizCobrada,
    faixas,
    alerts: buildAlerts(input),
  };
}

export type { FaixaCosts, FaixaProduction };
