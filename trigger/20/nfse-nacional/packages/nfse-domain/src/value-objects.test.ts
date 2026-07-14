import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IdentificadorDps } from './value-objects.js';
import { DpsStateMachine } from './state-machine.js';

describe('IdentificadorDps', () => {
  it('gera id com 43 caracteres', () => {
    const id = IdentificadorDps.create({
      codigoMunicipio: '3550308',
      tipoInscricao: '2',
      inscricaoFederal: '12345678000199',
      serie: '00001',
      numeroDps: '1',
    });
    assert.equal(id.toString().length, 43);
    assert.ok(id.toString().startsWith('3550308'));
  });
});

describe('DpsStateMachine', () => {
  it('permite RASCUNHO → ENVIANDO', () => {
    assert.ok(DpsStateMachine.canTransition('RASCUNHO', 'ENVIANDO'));
  });

  it('rejeita CANCELADA → AUTORIZADA', () => {
    assert.ok(!DpsStateMachine.canTransition('CANCELADA', 'AUTORIZADA'));
  });
});
