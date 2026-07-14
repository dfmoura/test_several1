import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyEmissaoDefaults } from './tributacao-simples-nacional.js';
import { ValidadorRegrasNegocio } from './services.js';

describe('applyEmissaoDefaults', () => {
  it('preenche opSimpNac, regApTribSN e totTrib padrão', () => {
    const input = applyEmissaoDefaults(
      {
        tomador: { tipo: 'PJ', cpfCnpj: '12345678000199' },
        servico: { codigoServico: '010701', descricao: 'Teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 100 },
      },
      true,
    );

    assert.equal(input.opSimpNac, '3');
    assert.equal(input.regApTribSN, '1');
    assert.equal(input.totTrib?.modo, 'aliquota_sn');
    assert.equal(input.totTrib?.aliquotaSimplesNacional, 6);
  });

  it('não inclui regApTribSN para não optante', () => {
    const input = applyEmissaoDefaults(
      {
        tomador: { tipo: 'PJ', cpfCnpj: '12345678000199' },
        servico: { codigoServico: '010701', descricao: 'Teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 100 },
      },
      false,
    );

    assert.equal(input.opSimpNac, '1');
    assert.equal(input.regApTribSN, undefined);
  });
});

describe('ValidadorRegrasNegocio — totTrib', () => {
  const base = {
    tomador: { tipo: 'PJ' as const, cpfCnpj: '12345678000199' },
    servico: { codigoServico: '010701', descricao: 'Teste', codigoMunicipioIncidencia: '3550308' },
    valores: { valorServico: 100 },
    opSimpNac: '3' as const,
    regApTribSN: '1' as const,
  };

  it('exige campos monetários no modo valores', () => {
    const validador = new ValidadorRegrasNegocio();
    assert.throws(
      () =>
        validador.validarEmissao({
          ...base,
          totTrib: { modo: 'valores', valorFederal: 1, valorEstadual: 2 },
        }),
      /Valor aproximado municipal/,
    );
  });
});
