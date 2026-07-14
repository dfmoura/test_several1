import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRetencaoContribSociais, labelTpRetPisCofins } from './tributacao-federal.js';

describe('tributacao-federal', () => {
  it('labelTpRetPisCofins retorna descrição oficial NT-007', () => {
    assert.ok(labelTpRetPisCofins('3').includes('PIS/COFINS/CSLL Retidos'));
    assert.equal(labelTpRetPisCofins('0'), 'PIS/COFINS/CSLL Não Retidos');
    assert.equal(labelTpRetPisCofins(''), '');
  });

  it('isRetencaoContribSociais identifica códigos com retenção', () => {
    assert.equal(isRetencaoContribSociais('0'), false);
    assert.equal(isRetencaoContribSociais('2'), false);
    assert.equal(isRetencaoContribSociais('1'), true);
    assert.equal(isRetencaoContribSociais('3'), true);
    assert.equal(isRetencaoContribSociais('8'), true);
  });
});
