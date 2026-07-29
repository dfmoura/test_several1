/**
 * Testes unitários do rateio dual NF-e / NFS-e.
 * Executar: npx tsx --test apps/web/src/domain/faturamento/split-dual.test.ts
 * (ou via vitest quando configurado no web)
 */

import assert from "node:assert/strict";
import { classificarCustos, splitDualFaturamento } from "./split-dual";

const costs = {
  valorPapel: 400,
  valorMaquina: 300,
  valorTrocaProduto: 50,
  valorTrocaBobina: 0,
  tinta: 80,
  acabamento: 100,
  rebobinacao: 20,
  tubete: 30,
  valorCaixa: 20,
};

{
  const { custoMercadoria, custoServico } = classificarCustos(costs);
  assert.equal(custoMercadoria, 550); // 400+100+30+20
  assert.equal(custoServico, 450); // 300+50+80+20
}

{
  const split = splitDualFaturamento({
    valorEtiqueta: 1000,
    valorMatriz: 0,
    costs,
  });
  // 550/1000 * 1000 = 550 mercadoria; 450 serviço
  assert.equal(split.valorMercadoria, 550);
  assert.equal(split.valorServico, 450);
  assert.equal(split.valorMercadoria + split.valorServico, 1000);
}

{
  const split = splitDualFaturamento({
    valorEtiqueta: 1000,
    valorMatriz: 200,
    costs,
  });
  assert.equal(split.valorMercadoria, 550);
  assert.equal(split.valorServico, 650); // 450 + 200 matriz
  assert.equal(split.valorMatriz, 200);
}

{
  const split = splitDualFaturamento({ valorEtiqueta: 100, costs: null });
  assert.equal(split.valorMercadoria + split.valorServico, 100);
  assert.ok(split.valorMercadoria > 0);
  assert.ok(split.valorServico > 0);
}

console.log("split-dual: ok");
