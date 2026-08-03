/**
 * Planejamento fiscal alinhado ao estudo 32 (NF-e produção, não dual).
 */

import assert from "node:assert/strict";
import { planejarDocumentosSaida } from "./planejar";
import { FISCAL_DEFAULTS } from "./defaults";

const planoPa = planejarDocumentosSaida({
  itens: [
    {
      descricao: "ETIQUETAS BOPP | 95x35",
      quantidade: 10000,
      unidade: "UN",
      valorUnitario: 0.05,
      valorTotal: 500,
      documentoSaidaPadrao: "NFE",
      tipoProduto: "ACABADO",
      cfop: "5101",
      ncm: "39191090",
    },
    {
      descricao: "Matriz flexográfica",
      quantidade: 1,
      unidade: "UN",
      valorUnitario: 120,
      valorTotal: 120,
      documentoSaidaPadrao: "NFE",
      tipoProduto: "ACABADO",
      cfop: "5101",
      ncm: "84425000",
    },
  ],
  quantidadePedido: 10000,
  valorTotalPedido: 620,
  documentoPadraoEmpresa: "NFE",
});

assert.equal(planoPa.emitirNfe, true);
assert.equal(planoPa.emitirNfse, false);
assert.equal(planoPa.nfe?.itens.length, 2);
assert.ok(planoPa.resumo.includes("Produção própria") || planoPa.resumo.includes("NF-e"));
assert.equal(planoPa.nfe?.naturezaOperacao, FISCAL_DEFAULTS.naturezaProducao);

const planoSvc = planejarDocumentosSaida({
  itens: [
    {
      descricao: "Rebobinação",
      quantidade: 1,
      unidade: "UN",
      valorUnitario: 80,
      valorTotal: 80,
      documentoSaidaPadrao: "NFSE",
      tipoProduto: "SERVICO",
    },
  ],
  quantidadePedido: 1,
  valorTotalPedido: 80,
  documentoPadraoEmpresa: "NFE",
});
assert.equal(planoSvc.emitirNfse, true);
assert.equal(planoSvc.emitirNfe, false);

console.log("planejar.test.ts OK");
