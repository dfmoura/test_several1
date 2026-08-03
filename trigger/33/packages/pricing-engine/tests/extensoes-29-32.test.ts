import { describe, expect, it } from "vitest";
import {
  calculateQuote,
  loadLookupsFromFiles,
  loadParamsFromFiles,
  type QuoteInput,
} from "../src/index";

const lookups = loadLookupsFromFiles();
const params = loadParamsFromFiles();

function baseInput(over: Partial<QuoteInput> = {}): QuoteInput {
  return {
    larguraPapel: 7.5,
    puxada: 2.72749,
    cores: 1,
    papel: "BOPP BRILHO",
    acabamento: "COLD STAMP + COLA",
    qtdeModelos: 1,
    qtdeColunas: 2,
    etiqPorRolo: 1000,
    tubete: '3"',
    z: 43,
    maquinaGrupo: "MODULAR",
    impostoPct: 16,
    matriz: true,
    colunaRebobinacao: 1,
    rpm: 1300,
    comissaoPct: 5,
    faixas: [{ quantidade: 10000, tipoParada: "SEM PARADA" }],
    ...over,
  };
}

describe("extensões estilo 29 / estudo 32", () => {
  it("zera matriz quando matrizJaCobrada", () => {
    const a = calculateQuote(baseInput({ matriz: true, matrizJaCobrada: false }), lookups, params);
    const b = calculateQuote(baseInput({ matriz: true, matrizJaCobrada: true }), lookups, params);
    expect(a.matrizCobrada).toBe(true);
    expect(a.valorMatriz).toBeGreaterThan(0);
    expect(b.matrizCobrada).toBe(false);
    expect(b.valorMatriz).toBe(0);
    expect(b.faixas[0].commercial.valorMatriz).toBe(0);
  });

  it("aplica comissão por faixa", () => {
    const r = calculateQuote(
      baseInput({
        comissaoPct: 5,
        faixas: [
          { quantidade: 10000, tipoParada: "SEM PARADA", comissaoPct: 0 },
          { quantidade: 20000, tipoParada: "SEM PARADA", comissaoPct: 10 },
        ],
      }),
      lookups,
      params,
    );
    expect(r.faixas[0].commercial.comissaoPct).toBe(0);
    expect(r.faixas[0].commercial.comissao).toBe(0);
    expect(r.faixas[1].commercial.comissaoPct).toBe(10);
    expect(r.faixas[1].commercial.comissao).toBeGreaterThan(0);
  });

  it("aplica override de papel R$/m²", () => {
    const catalog = calculateQuote(baseInput(), lookups, params);
    const ov = calculateQuote(
      baseInput({ overrides: { papelM2: lookups.precoPapelM2["BOPP BRILHO"] * 2 } }),
      lookups,
      params,
    );
    expect(ov.faixas[0].costs.valorPapel).toBeCloseTo(
      catalog.faixas[0].costs.valorPapel * 2,
      2,
    );
  });

  it("expõe perda papel troca produto na produção", () => {
    const r = calculateQuote(baseInput({ qtdeModelos: 3 }), lookups, params);
    expect(r.faixas[0].production.perdaPapelTrocaProduto).toBeCloseTo(
      r.faixas[0].production.perdaAcerto * 3,
      5,
    );
    expect(r.faixas[0].costs.valorPapelTrocaProduto).toBeGreaterThan(0);
  });
});
