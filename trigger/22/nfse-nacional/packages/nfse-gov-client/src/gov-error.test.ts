import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatarErroGov, primeiroErroGov } from './gov-error.js';

describe('gov-error', () => {
  it('lê erro em minúsculo (resposta SEFIN eventos)', () => {
    const body = {
      erro: [{
        codigo: 'E1235',
        descricao: 'Falha no esquema XML do DF-e.',
        complemento: 'Pattern constraint failed.',
      }],
    };

    const parsed = primeiroErroGov(body);
    assert.equal(parsed?.codigo, 'E1235');
    assert.equal(parsed?.descricao, 'Falha no esquema XML do DF-e.');
    assert.match(formatarErroGov(body, 400), /\[E1235\]/);
  });

  it('lê erros em PascalCase (emissão)', () => {
    const body = {
      erros: [{
        Codigo: 'E0001',
        Descricao: 'Rejeição',
      }],
    };

    const parsed = primeiroErroGov(body);
    assert.equal(parsed?.codigo, 'E0001');
    assert.equal(parsed?.descricao, 'Rejeição');
  });
});
