import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  labelSuspensaoExigibilidade,
  labelTipoImunidade,
  labelTributacaoIssqn,
} from './tributacao-municipal.js';

describe('tributacao-municipal labels', () => {
  it('formata tributação ISSQN', () => {
    assert.equal(labelTributacaoIssqn('1'), 'Operação tributável');
    assert.equal(labelTributacaoIssqn('2'), 'Imunidade');
  });

  it('formata tipo de imunidade', () => {
    assert.ok(labelTipoImunidade('1').includes('CF88'));
    assert.equal(labelTipoImunidade(undefined), '');
  });

  it('formata suspensão — padrão Não', () => {
    assert.equal(labelSuspensaoExigibilidade(undefined), 'Não');
    assert.equal(labelSuspensaoExigibilidade('1'), 'Exigibilidade do ISSQN Suspensa por Decisão Judicial');
  });

  it('formata regime especial e retenção ISSQN', async () => {
    const { labelRegimeEspecial, labelRetencaoIssqn } = await import('./tributacao-municipal.js');
    assert.equal(labelRegimeEspecial('0'), 'Nenhum');
    assert.equal(labelRegimeEspecial('3'), 'Microempresa Municipal');
    assert.equal(labelRetencaoIssqn('2'), 'Retido pelo Tomador');
  });
});
