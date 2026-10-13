import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { patchEnderecoFromCep } from '../src/lib/api.ts';
import { aplicarCnpjNoParceiro, type ParceiroCnpjAlvo } from '../src/lib/parceiroCnpj.ts';

function ficha(patch: Partial<ParceiroCnpjAlvo> = {}): ParceiroCnpjAlvo {
  return {
    razao_social: 'Fornecedor Manual',
    nome_fantasia: 'Manual',
    logradouro: 'Rua do Operador',
    numero: '42',
    complemento: 'Sala 3',
    bairro: 'Centro',
    municipio: 'Uberlândia',
    uf: 'MG',
    cep: '38400000',
    ibge: '3170206',
    telefone: '34999999999',
    email: 'compras@manual.test',
    regime: 'REAL',
    regime_desde: '2024-01-01',
    area_incentivada: false,
    suframa: '',
    cnae: '1811100',
    cnaes_secundarios: [],
    ...patch,
  };
}

const cartaoVazio = {
  razao_social: 'FORNECEDOR RECEITA',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: 'UBERLANDIA',
  uf: 'MG',
  cep: '38400000',
};

describe('aplicarCnpjNoParceiro', () => {
  it('consulta ao abrir não apaga rua, número e complemento já gravados', () => {
    const atual = ficha();
    const aplicado = aplicarCnpjNoParceiro(atual, cartaoVazio, 'silent');

    assert.equal(aplicado.ficha.logradouro, 'Rua do Operador');
    assert.equal(aplicado.ficha.numero, '42');
    assert.equal(aplicado.ficha.complemento, 'Sala 3');
    assert.equal(aplicado.ficha.razao_social, 'Fornecedor Manual');
    assert.deepEqual(aplicado.divergencias, []);
    assert.equal(aplicado.mensagem, '');
  });

  it('consulta ao abrir só completa endereço que está em branco', () => {
    const aplicado = aplicarCnpjNoParceiro(
      ficha({ logradouro: '', numero: '', complemento: '', bairro: '' }),
      {
        logradouro: 'Avenida Brasil',
        numero: '100',
        complemento: 'Loja 2',
        bairro: 'Fundinho',
        razao_social: 'NAO TROCAR',
      },
      'silent',
    );

    assert.equal(aplicado.ficha.logradouro, 'Avenida Brasil');
    assert.equal(aplicado.ficha.numero, '100');
    assert.equal(aplicado.ficha.complemento, 'Loja 2');
    assert.equal(aplicado.ficha.bairro, 'Fundinho');
    assert.equal(aplicado.ficha.razao_social, 'Fornecedor Manual');
  });

  it('botão Consultar não apaga o que foi digitado quando a Receita vem vazia', () => {
    const aplicado = aplicarCnpjNoParceiro(ficha(), cartaoVazio, 'explicit');

    assert.equal(aplicado.ficha.logradouro, 'Rua do Operador');
    assert.equal(aplicado.ficha.numero, '42');
    assert.equal(aplicado.ficha.complemento, 'Sala 3');
    assert.equal(aplicado.ficha.razao_social, 'FORNECEDOR RECEITA');
    assert.equal(aplicado.divergencias.length, 0);
    assert.match(aplicado.mensagem, /Dados do CNPJ importados/);
    assert.doesNotMatch(aplicado.mensagem, /Complete logradouro/);
  });

  it('botão Consultar preenche rua e número vazios e pede o que faltou', () => {
    const aplicado = aplicarCnpjNoParceiro(
      ficha({ logradouro: '', numero: '  ', complemento: '' }),
      { logradouro: '', numero: '', complemento: '', razao_social: 'FORNECEDOR' },
      'explicit',
    );

    assert.equal(aplicado.ficha.logradouro, '');
    assert.equal(aplicado.ficha.numero, '  ');
    assert.equal(aplicado.ficha.complemento, '');
    assert.match(aplicado.mensagem, /Complete logradouro e número/);
    assert.match(aplicado.mensagem, /Complemento, se houver, é opcional/);
  });

  it('botão Consultar avisa divergência e mantém a ficha', () => {
    const aplicado = aplicarCnpjNoParceiro(
      ficha(),
      {
        logradouro: 'Outra Rua',
        numero: '9',
        complemento: 'Bloco B',
        razao_social: 'FORNECEDOR RECEITA',
      },
      'explicit',
    );

    assert.equal(aplicado.ficha.logradouro, 'Rua do Operador');
    assert.equal(aplicado.ficha.numero, '42');
    assert.equal(aplicado.ficha.complemento, 'Sala 3');
    assert.deepEqual(aplicado.divergencias, ['logradouro', 'numero', 'complemento']);
    assert.match(aplicado.mensagem, /manteve o que já estava preenchido/);
  });

  it('mesma rua com caixa diferente não é divergência e o número 0 permanece', () => {
    const aplicado = aplicarCnpjNoParceiro(
      ficha({ numero: '0', logradouro: 'rua do operador' }),
      { logradouro: 'RUA DO OPERADOR', numero: '', complemento: '' },
      'explicit',
    );

    assert.equal(aplicado.ficha.logradouro, 'rua do operador');
    assert.equal(aplicado.ficha.numero, '0');
    assert.deepEqual(aplicado.divergencias, []);
  });
});

describe('patchEnderecoFromCep', () => {
  it('CEP sem logradouro não apaga a rua e não copia complemento de faixa', () => {
    const patch = patchEnderecoFromCep(
      { logradouro: '', complemento: 'lado par', bairro: '', localidade: 'Uberlândia', uf: 'MG' },
      { logradouro: 'Rua do Operador', complemento: 'Sala 3', bairro: 'Centro' },
    );

    assert.equal(patch.logradouro, 'Rua do Operador');
    assert.equal(patch.complemento, 'Sala 3');
    assert.equal(patch.bairro, 'Centro');
    assert.equal(patch.municipio, 'Uberlândia');
  });
});
