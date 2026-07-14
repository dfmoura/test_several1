import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeDadosCnpj } from './cnpj-data-merge.js';
import type { DadosCnpj } from './types.js';

const brasilBase: DadosCnpj = {
  cnpj: '53369941000163',
  razaoSocial: 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
  situacaoCadastral: 'ATIVA',
  endereco: {
    logradouro: 'AV ARAGUARI',
    numero: '2815',
    bairro: 'DANIEL FONSECA',
    codigoMunicipio: '3170206',
    uf: 'MG',
    cep: '38400313',
    nomeMunicipio: 'Uberlândia',
  },
  fontes: ['brasilapi'],
};

const receitaExtra: DadosCnpj = {
  cnpj: '53369941000163',
  razaoSocial: 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
  nomeFantasia: 'TRIGGER DATA INTELLIGENCE',
  situacaoCadastral: 'ATIVA',
  email: 'contato@trigger.com',
  telefone: '34999996660',
  endereco: {
    logradouro: 'AVENIDA ARAGUARI',
    numero: '2815',
    complemento: 'APT 304',
    bairro: 'DANIEL FONSECA',
    codigoMunicipio: '0000000',
    uf: 'MG',
    cep: '38400313',
    nomeMunicipio: 'Uberlandia',
  },
  porte: 'MICRO EMPRESA',
  naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
  dataAbertura: '04/01/2024',
  tipoEstabelecimento: 'MATRIZ',
  optanteSimples: true,
  atividadePrincipal: { codigo: '85.99-6-04', descricao: 'Treinamento em desenvolvimento profissional' },
  fontes: ['receitaws'],
};

describe('mergeDadosCnpj', () => {
  it('preserva código IBGE da Brasil API e complementa com Receita WS', () => {
    const merged = mergeDadosCnpj(brasilBase, receitaExtra);
    assert.ok(merged);
    assert.equal(merged.endereco.codigoMunicipio, '3170206');
    assert.equal(merged.nomeFantasia, 'TRIGGER DATA INTELLIGENCE');
    assert.equal(merged.email, 'contato@trigger.com');
    assert.equal(merged.porte, 'MICRO EMPRESA');
    assert.equal(merged.optanteSimples, true);
    assert.deepEqual(merged.fontes, ['brasilapi', 'receitaws']);
  });

  it('retorna fonte única quando só uma API responde', () => {
    const onlyReceita = mergeDadosCnpj(null, receitaExtra);
    assert.ok(onlyReceita);
    assert.equal(onlyReceita.fontes?.[0], 'receitaws');
  });

  it('não sobrescreve e-mail já preenchido na fonte primária', () => {
    const withEmail = { ...brasilBase, email: 'ja@preenchido.com' };
    const merged = mergeDadosCnpj(withEmail, receitaExtra);
    assert.equal(merged?.email, 'ja@preenchido.com');
  });
});
