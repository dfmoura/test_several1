import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateQuote,
  catalogsDir,
  ceiling,
  loadLookupsFromFiles,
  loadParamsFromFiles,
  nearlyEqual,
  type QuoteInput,
} from "../src/index";

const golden = JSON.parse(
  readFileSync(join(catalogsDir(), "golden_banca_do_dinei.json"), "utf-8"),
);

const lookups = loadLookupsFromFiles();
const params = loadParamsFromFiles();

function buildInput(): QuoteInput {
  const g = golden.input;
  return {
    larguraPapel: g.largura_papel,
    puxada: g.puxada,
    cores: g.cores,
    papel: g.papel,
    acabamento: g.acabamento,
    qtdeModelos: g.qtde_modelos,
    qtdeColunas: g.qtde_colunas,
    etiqPorRolo: g.etiq_por_rolo,
    tubete: g.tubete,
    z: g.z,
    maquinaGrupo: g.maquina_grupo,
    impostoPct: g.imposto_pct,
    matriz: g.matriz,
    colunaRebobinacao: g.coluna_rebobinacao,
    rpm: g.rpm,
    comissaoPct: g.comissao_pct,
    faixas: g.faixas.map((f: { quantidade: number; tipo_parada: string }) => ({
      quantidade: f.quantidade,
      tipoParada: f.tipo_parada,
    })),
  };
}

describe("math.ceiling (Excel)", () => {
  it("arredonda metragem m² em 0.1", () => {
    expect(ceiling(20.455, 0.1)).toBe(20.5);
    expect(ceiling(40.91, 0.1)).toBe(41);
  });
  it("arredonda etiqueta em múltiplos de 10", () => {
    expect(ceiling(548.5804251992307, 10)).toBe(550);
    expect(ceiling(847.9008503984616, 10)).toBe(850);
  });
});

describe("golden BANCA DO DINEI", () => {
  const result = calculateQuote(buildInput(), lookups, params);
  const exp0 = golden.expected.faixas[0];
  const f0 = result.faixas[0];

  it("calcula valor matriz bruto ≈ 93.9113", () => {
    expect(nearlyEqual(result.valorMatrizBruto, golden.expected.matriz_bruta, 0.01)).toBe(true);
  });

  it("faixa 10k — produção", () => {
    expect(nearlyEqual(f0.production.horaMaquina, exp0.hora_maquina)).toBe(true);
    expect(nearlyEqual(f0.production.metragemLinear, exp0.metragem_linear)).toBe(true);
    expect(nearlyEqual(f0.production.metragemM2, exp0.metragem_m2)).toBe(true);
    expect(f0.production.perdaAcerto).toBe(exp0.perda_acerto);
    expect(f0.production.perdaAcabamento).toBe(exp0.perda_acabamento);
    expect(f0.production.qtdeRolos).toBe(exp0.qtde_rolos);
    expect(f0.production.qtdeCaixas).toBe(exp0.qtde_caixas);
  });

  it("faixa 10k — custos individuais < R$ 0,01", () => {
    expect(nearlyEqual(f0.costs.valorPapel, exp0.valor_papel)).toBe(true);
    expect(nearlyEqual(f0.costs.valorMaquina, exp0.valor_maquina)).toBe(true);
    expect(nearlyEqual(f0.costs.tinta, exp0.tinta)).toBe(true);
    expect(nearlyEqual(f0.costs.acabamento, exp0.acabamento)).toBe(true);
    expect(nearlyEqual(f0.costs.rebobinacao, exp0.rebobinacao)).toBe(true);
    expect(nearlyEqual(f0.costs.tubete, exp0.tubete)).toBe(true);
    expect(nearlyEqual(f0.costs.valorCaixa, exp0.valor_caixa)).toBe(true);
    expect(nearlyEqual(f0.costs.valorServico, exp0.valor_servico)).toBe(true);
  });

  it("faixa 10k — comercial", () => {
    expect(nearlyEqual(f0.commercial.comissao, exp0.comissao)).toBe(true);
    expect(nearlyEqual(f0.commercial.imposto, exp0.imposto)).toBe(true);
    expect(nearlyEqual(f0.commercial.servicoEncargos, exp0.servico_encargos)).toBe(true);
    expect(f0.commercial.valorEtiqueta).toBe(exp0.valor_etiqueta);
    expect(f0.commercial.valorMatriz).toBe(exp0.valor_matriz);
    expect(f0.commercial.valorTotal).toBe(exp0.valor_total);
  });

  it("faixa 20k — totais comerciais", () => {
    const exp = golden.expected.faixas[1];
    const f = result.faixas[1];
    expect(nearlyEqual(f.costs.valorServico, exp.valor_servico)).toBe(true);
    expect(f.commercial.valorEtiqueta).toBe(exp.valor_etiqueta);
    expect(f.commercial.valorTotal).toBe(exp.valor_total);
  });

  it("faixa 40k — totais comerciais", () => {
    const exp = golden.expected.faixas[2];
    const f = result.faixas[2];
    expect(nearlyEqual(f.production.metragemM2, exp.metragem_m2)).toBe(true);
    expect(nearlyEqual(f.costs.valorServico, exp.valor_servico)).toBe(true);
    expect(f.commercial.valorEtiqueta).toBe(exp.valor_etiqueta);
    expect(f.commercial.valorTotal).toBe(exp.valor_total);
  });

  it("faixa 60k — totais comerciais + caixas", () => {
    const exp = golden.expected.faixas[3];
    const f = result.faixas[3];
    expect(f.production.qtdeCaixas).toBe(exp.qtde_caixas);
    expect(nearlyEqual(f.costs.valorServico, exp.valor_servico)).toBe(true);
    expect(f.commercial.valorEtiqueta).toBe(exp.valor_etiqueta);
    expect(f.commercial.valorTotal).toBe(exp.valor_total);
  });

  it("calcula 4 faixas em < 100ms", () => {
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) calculateQuote(buildInput(), lookups, params);
    const elapsed = performance.now() - t0;
    expect(elapsed / 100).toBeLessThan(100);
  });
});
