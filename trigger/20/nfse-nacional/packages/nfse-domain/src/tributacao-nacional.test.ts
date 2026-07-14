import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buscarTributacaoNacional,
  buscarTributacaoPorCodigo,
  descricaoTributacaoNacional,
  formatCodigoTribComDescricao,
  formatCodigoTribNac,
  normalizeCodigoTribNac,
  resumirDescricaoTributacao,
} from './tributacao-nacional.js';

describe('tributacao-nacional', () => {
  it('normaliza e formata código de 6 dígitos', () => {
    assert.equal(normalizeCodigoTribNac('17.02.02'), '170202');
    assert.equal(formatCodigoTribNac('170202'), '17.02.02');
  });

  it('retorna descrição oficial por código', () => {
    const desc = descricaoTributacaoNacional('170202');
    assert.ok(desc?.includes('Expediente'));
    assert.equal(buscarTributacaoPorCodigo('170202')?.codigo, '170202');
  });

  it('busca por termo na descrição', () => {
    const results = buscarTributacaoNacional('consultoria informática');
    assert.ok(results.some((r) => r.codigo === '010601'));
  });

  it('busca por prefixo de código', () => {
    const results = buscarTributacaoNacional('1702');
    assert.ok(results.every((r) => r.codigo.startsWith('1702')));
  });

  it('resume descrição longa', () => {
    const long = 'Expediente, secretaria em geral, apoio e infra-estrutura administrativa e congêneres.';
    const short = resumirDescricaoTributacao(long, 40);
    assert.ok(short.endsWith('…'));
    assert.ok(short.length <= 42);
  });

  it('monta exibição código + descrição', () => {
    const text = formatCodigoTribComDescricao(
      '170202',
      'Expediente, secretaria em geral, apoio e infra-estrutura administrativa e congêneres.',
    );
    assert.ok(text.startsWith('17.02.02 - '));
  });
});
