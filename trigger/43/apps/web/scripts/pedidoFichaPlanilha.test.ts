import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  totalLinhaComercial,
  totaisComerciaisPlanilha,
  type PedidoPlanilhaComercialLinha,
} from '../src/lib/pedidoFichaPlanilha.ts';
import type { PedidoItem } from '../src/lib/api.ts';

function linha(
  patch: Partial<PedidoPlanilhaComercialLinha> & Pick<PedidoPlanilhaComercialLinha, 'key'>,
): PedidoPlanilhaComercialLinha {
  const base = {
    itemOrdem: 1,
    primeiraDoDocumento: false,
    primeiraDoItem: false,
    quant: 1000,
    medida: null,
    larguraCm: null,
    puxadaCm: null,
    modelo: 'A',
    material: null,
    obs: null,
    cores: null,
    valorMatriz: null,
    valorArte: 0,
    valorFaca: null,
    valorMilheiro: null,
    comissao: null,
    unitario: null,
    valorRolo: null,
    subtotal: 0,
    totalLinha: 0,
    ...patch,
  };
  return {
    ...base,
    totalLinha: patch.totalLinha ?? totalLinhaComercial(base),
  };
}

describe('pedidoFichaPlanilha · totalLinha', () => {
  it('soma etiqueta + matriz + arte + faca e ignora comissão', () => {
    assert.equal(
      totalLinhaComercial({
        subtotal: 3500,
        valorMatriz: 340,
        valorArte: 150,
        valorFaca: 180,
      }),
      4170,
    );
  });

  it('totais alinhados espelham somaValores no comercial', () => {
    const linhas = [
      linha({
        key: 'a',
        quant: 5000,
        subtotal: 1750,
        valorMatriz: 170,
        valorArte: 80,
        valorFaca: 90,
        comissao: 87.5,
      }),
      linha({
        key: 'b',
        quant: 3000,
        subtotal: 1050,
        valorMatriz: 102,
        valorArte: 50,
        valorFaca: 54,
        comissao: 52.5,
      }),
      linha({
        key: 'c',
        quant: 2000,
        subtotal: 700,
        valorMatriz: 68,
        valorArte: 20,
        valorFaca: 36,
        comissao: 35,
      }),
    ];
    const itens = [{ valor_total: 4170 } as PedidoItem];
    const totais = totaisComerciaisPlanilha(itens, linhas);
    assert.equal(totais.quant, 10000);
    assert.equal(totais.subtotalEtiquetas, 3500);
    assert.equal(totais.matriz, 340);
    assert.equal(totais.artes, 150);
    assert.equal(totais.faca, 180);
    assert.equal(totais.comissao, 175);
    assert.equal(totais.totalLinhas, 4170);
    assert.equal(totais.comercial, 4170);
  });
});
