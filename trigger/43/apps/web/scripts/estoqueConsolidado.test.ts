import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { linhasConsolidado } from '../src/lib/estoqueUi.ts';

type Saldo = {
  id: number;
  produto?: {
    codigo?: string | null;
    descricao_comercial?: string | null;
    familia?: string | null;
  } | null;
  qtde: string;
  unidade: string;
  volumes_por_qtde?: Array<{
    qtde?: string | null;
    volumes?: number | null;
    unidade?: string | null;
    largura_mm?: string | null;
    comprimento_m?: string | null;
  }> | null;
};

function saldo(patch: Partial<Saldo> & Pick<Saldo, 'id' | 'qtde'>): Saldo {
  return {
    unidade: 'M2',
    produto: { codigo: 'MP-PAP-092', descricao_comercial: 'Couché', familia: 'MP' },
    ...patch,
  };
}

describe('linhasConsolidado', () => {
  it('agrupa por quantidade e dimensão e preserva a ordem da faixa', () => {
    const linhas = linhasConsolidado([
      saldo({
        id: 1,
        qtde: '23.5000',
        volumes_por_qtde: [
          { qtde: '10.0000', volumes: 1, unidade: 'M2', largura_mm: '210.000', comprimento_m: '1000.000' },
          { qtde: '5.5000', volumes: 1, unidade: 'M2', largura_mm: '210.000', comprimento_m: '1000.000' },
          { qtde: '8.0000', volumes: 1, unidade: 'M2', largura_mm: '210.000', comprimento_m: '1020.000' },
        ],
      }),
    ], '');

    assert.deepEqual(
      linhas.map((l) => [l.qtde, l.comprimento_m, l.volumes]),
      [
        ['10.0000', '1000.000', 1],
        ['5.5000', '1000.000', 1],
        ['8.0000', '1020.000', 1],
      ],
    );
  });

  it('junta a contagem quando a faixa já veio agregada', () => {
    const linhas = linhasConsolidado([
      saldo({
        id: 2,
        qtde: '20.0000',
        volumes_por_qtde: [
          { qtde: '10.0000', volumes: 2, unidade: 'M2', largura_mm: '210.000', comprimento_m: '1000.000' },
        ],
      }),
    ], '');

    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].volumes, 2);
    assert.equal(linhas[0].qtde, '10.0000');
  });

  it('item sem volume usa a quantidade do saldo e não inventa dimensão', () => {
    const linhas = linhasConsolidado([
      saldo({
        id: 3,
        qtde: '40.0000',
        unidade: 'UN',
        produto: { codigo: 'EMB-TUB-01', descricao_comercial: 'Tubete', familia: 'EMB' },
        volumes_por_qtde: [],
      }),
    ], '');

    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].qtde, '40.0000');
    assert.equal(linhas[0].unidade, 'UN');
    assert.equal(linhas[0].volumes, null);
    assert.equal(linhas[0].largura_mm, null);
    assert.equal(linhas[0].comprimento_m, null);
  });

  it('busca por dimensão mostra só a faixa e ordena pelo código do produto', () => {
    const linhas = linhasConsolidado([
      saldo({
        id: 9,
        qtde: '8.0000',
        produto: { codigo: 'MP-PAP-200', familia: 'MP' },
        volumes_por_qtde: [
          { qtde: '8.0000', volumes: 1, largura_mm: '330.000', comprimento_m: '500.000' },
        ],
      }),
      saldo({
        id: 1,
        qtde: '18.0000',
        produto: { codigo: 'MP-PAP-092', descricao_comercial: 'Couché', familia: 'MP' },
        volumes_por_qtde: [
          { qtde: '10.0000', volumes: 1, largura_mm: '210.000', comprimento_m: '1000.000' },
          { qtde: '8.0000', volumes: 1, largura_mm: '210.000', comprimento_m: '1020.000' },
        ],
      }),
    ], '1020');

    assert.equal(linhas.length, 1);
    assert.equal(linhas[0].saldo.id, 1);
    assert.equal(linhas[0].comprimento_m, '1020.000');
  });

  it('filtra família e ignora saldo zerado', () => {
    const linhas = linhasConsolidado([
      saldo({ id: 1, qtde: '0.0000', volumes_por_qtde: [] }),
      saldo({
        id: 2,
        qtde: '4.0000',
        unidade: 'UN',
        produto: { codigo: 'REV-01', familia: 'REV' },
        volumes_por_qtde: [],
      }),
    ], '', 'MP');

    assert.equal(linhas.length, 0);
  });
});
