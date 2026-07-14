import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarNbs,
  buscarNbsPorCodigo,
  formatCodigoNbs,
  formatCodigoNbsComDescricao,
  nbsCorrelacionadosTribNac,
  normalizeCodigoNbs,
} from './nbs.js';

describe('NBS — base oficial', () => {
  it('normaliza código para 9 dígitos', () => {
    assert.equal(normalizeCodigoNbs('1.1806.40.00'), '118064000');
    assert.equal(normalizeCodigoNbs('118064000'), '118064000');
    assert.equal(normalizeCodigoNbs('12345'), null);
  });

  it('formata código NBS', () => {
    assert.equal(formatCodigoNbs('118064000'), '1.1806.40.00');
  });

  it('busca código conhecido do ANEXO_B', () => {
    const item = buscarNbsPorCodigo('118064000');
    assert.ok(item);
    assert.match(item!.descricao, /escritório/i);
  });

  it('correlaciona NBS ao cTribNac 170202', () => {
    const items = nbsCorrelacionadosTribNac('170202');
    assert.ok(items.length > 0);
    assert.ok(items.some((i) => i.codigo === '118064000'));
  });

  it('busca textual por descrição', () => {
    const items = buscarNbs('apoio administrativo', 5);
    assert.ok(items.length > 0);
  });

  it('monta exibição código + descrição', () => {
    const text = formatCodigoNbsComDescricao('118064000');
    assert.match(text, /^1\.1806\.40\.00/);
    assert.match(text, /escritório/i);
  });
});
