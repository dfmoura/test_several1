import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IdentificadorDps, validarMotivoCancelamento } from './value-objects.js';
import { DpsStateMachine } from './state-machine.js';
import { ValidationError } from '@nfse/shared';

describe('IdentificadorDps', () => {
  it('gera id com 42 caracteres e nDPS de 15 posições', () => {
    const id = IdentificadorDps.create({
      codigoMunicipio: '3550308',
      tipoInscricao: '2',
      inscricaoFederal: '12345678000199',
      serie: '00001',
      numeroDps: '54',
    });
    assert.equal(id.toString().length, 42);
    assert.ok(id.toString().startsWith('3550308'));
    assert.ok(id.toString().endsWith('000000000000054'));
    assert.equal(`DPS${id.toString()}`.length, 45);
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

describe('validarMotivoCancelamento', () => {
  it('aceita motivo válido com espaços internos', () => {
    const motivo = 'Erro na emissao da nota fiscal de servico';
    assert.equal(validarMotivoCancelamento(motivo), motivo);
  });

  it('remove espaços nas extremidades', () => {
    assert.equal(
      validarMotivoCancelamento('  Erro na emissao da nota fiscal  '),
      'Erro na emissao da nota fiscal',
    );
  });

  it('rejeita motivo curto após trim', () => {
    assert.throws(
      () => validarMotivoCancelamento('curto demais   '),
      ValidationError,
    );
  });

  it('corrige espaço no final (caso E1235 da SEFIN)', () => {
    const comEspacoFinal = 'esta errado esta errado esta errado esta errado esta errado esta errado ';
    const normalizado = validarMotivoCancelamento(comEspacoFinal);
    assert.ok(!normalizado.endsWith(' '));
    assert.ok(normalizado.length >= 15);
  });
});
