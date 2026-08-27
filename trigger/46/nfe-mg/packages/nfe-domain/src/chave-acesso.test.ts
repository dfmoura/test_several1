import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarChaveAcesso, validarChaveAcesso, modulo11, parseChaveAcesso } from './chave-acesso.js';
import { NfeStateMachine, situacaoFromCStat } from './state-machine.js';

test('modulo11 conhecido', () => {
  // base de 43 dígitos sintética
  const base = '3112081234567800019955001000000001101234567';
  assert.equal(base.length, 43);
  const dv = modulo11(base);
  assert.match(dv, /^[0-9]$/);
  assert.equal(validarChaveAcesso(base + dv), true);
});

test('gerar e validar chave MG modelo 55', () => {
  const chave = gerarChaveAcesso({
    aamm: '2608',
    cnpj: '12345678000199',
    serie: 1,
    numero: 1,
    cNF: '12345678',
  });
  assert.equal(chave.length, 44);
  assert.equal(chave.startsWith('3126081234567800019955'), true);
  assert.equal(validarChaveAcesso(chave), true);
  const parsed = parseChaveAcesso(chave);
  assert.equal(parsed.cUF, '31');
  assert.equal(parsed.modelo, '55');
  assert.equal(parsed.serie, 1);
  assert.equal(parsed.numero, 1);
});

test('chave inválida falha', () => {
  const valida = gerarChaveAcesso({
    aamm: '2608',
    cnpj: '12345678000199',
    serie: 1,
    numero: 1,
    cNF: '12345678',
  });
  const invalida = valida.slice(0, 43) + (valida[43] === '0' ? '1' : '0');
  assert.equal(validarChaveAcesso(invalida), false);
  assert.equal(validarChaveAcesso('123'), false);
});

test('state machine autorizada → cancelada', () => {
  assert.equal(NfeStateMachine.canTransition('AUTORIZADA', 'CANCELADA'), true);
  assert.equal(NfeStateMachine.canTransition('CANCELADA', 'AUTORIZADA'), false);
  assert.equal(NfeStateMachine.transition('ENVIANDO', 'AUTORIZADA'), 'AUTORIZADA');
});

test('cStat mapeia situação', () => {
  assert.equal(situacaoFromCStat('100'), 'AUTORIZADA');
  assert.equal(situacaoFromCStat('105'), 'PROCESSANDO');
  assert.equal(situacaoFromCStat('110'), 'DENEGADA');
  assert.equal(situacaoFromCStat('204'), 'REJEITADA');
});
