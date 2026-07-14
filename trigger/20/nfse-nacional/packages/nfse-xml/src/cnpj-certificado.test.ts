import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCnpj, extrairRazaoSocialDoSubject } from './cnpj-certificado.js';

describe('cnpj-certificado', () => {
  it('normaliza CNPJ com pontuação', () => {
    assert.equal(normalizarCnpj('53.369.941/0001-63'), '53369941000163');
  });

  it('extrai CNPJ de subject ICP-Brasil típico', () => {
    const subject = 'CN=TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA:53369941000163,O=ICP-Brasil';
    const match = subject.match(/:(\d{14})(?:[,/]|$)/);
    assert.equal(match?.[1], '53369941000163');
  });

  it('extrai razão social de subject ICP-Brasil típico', () => {
    const subject = 'CN=TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA:53369941000163,O=ICP-Brasil';
    assert.equal(
      extrairRazaoSocialDoSubject(subject),
      'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
    );
  });
});
