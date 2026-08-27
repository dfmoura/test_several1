import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveIndIeDest,
  evaluateParceiroFiscal,
  syncIeInd,
  evaluateProdutoFiscal,
  syncCclassTribCst,
  cstFromCclassTrib,
} from './index.js';

describe('parceiro-fiscal', () => {
  it('deriva indIEDest a partir da IE', () => {
    assert.equal(deriveIndIeDest('0623079040083'), '1');
    assert.equal(deriveIndIeDest('ISENTO'), '2');
    assert.equal(deriveIndIeDest(undefined), '9');
  });

  it('sincroniza IE e indIEDest', () => {
    const s = syncIeInd({ inscricaoEstadual: 'ISENTO' });
    assert.equal(s.indIEDest, '2');
    assert.equal(s.ieStatus, 'ISENTA');
  });

  it('marca cliente apto quando cadastro fiscal completo', () => {
    const r = evaluateParceiroFiscal({
      apelido: 'Cliente MG',
      razaoSocial: 'CLIENTE TESTE LTDA',
      tipo: 'PJ',
      cpfCnpj: '12345678000199',
      papelCliente: true,
      emiteDocumentoFiscal: true,
      ativo: true,
      inscricaoEstadual: '0623079040083',
      indIEDest: '1',
      ieStatus: 'OK',
      finalidade: 'REVENDA',
      emailXml: 'xml@cliente.com',
      endereco: {
        logradouro: 'RUA A',
        numero: '100',
        bairro: 'CENTRO',
        municipio: 'BELO HORIZONTE',
        uf: 'MG',
        cep: '30120000',
        codigoMunicipio: '3106200',
      },
    });
    assert.equal(r.completo, true);
    assert.equal(r.aptoEmissaoNfe, true);
    assert.equal(r.aptoReforma, true);
  });

  it('exige finalidade e e-mail XML para cliente', () => {
    const r = evaluateParceiroFiscal({
      razaoSocial: 'X',
      tipo: 'PJ',
      cpfCnpj: '12345678000199',
      papelCliente: true,
      endereco: {
        logradouro: 'RUA A',
        numero: '1',
        bairro: 'B',
        municipio: 'BH',
        uf: 'MG',
        cep: '30120000',
        codigoMunicipio: '3106200',
      },
    });
    assert.ok(r.pendencias.some((p) => p.includes('Finalidade')));
    assert.ok(r.pendencias.some((p) => p.includes('E-mail')));
  });
});

describe('produto-fiscal', () => {
  it('extrai CST de cClassTrib', () => {
    assert.equal(cstFromCclassTrib('010001'), '010');
  });

  it('sincroniza cClassTrib → CST IBS/CBS', () => {
    const s = syncCclassTribCst({ cclassTrib: '000001' });
    assert.equal(s.cstIbsCbs, '000');
    assert.equal(s.cclassTrib, '000001');
  });

  it('produto completo com reforma fica apto', () => {
    const r = evaluateProdutoFiscal({
      codigo: 'PA-001',
      descricao: 'ETIQUETA BOPP',
      ncm: '39191090',
      cfop: '5101',
      origem: '0',
      csosn: '102',
      cstPis: '49',
      cstCofins: '49',
      cclassTrib: '010001',
      cstIbsCbs: '010',
      ativo: true,
    });
    assert.equal(r.completo, true);
    assert.equal(r.aptoEmissaoNfe, true);
    assert.equal(r.aptoReforma, true);
  });

  it('detecta divergência CST × cClassTrib', () => {
    const r = evaluateProdutoFiscal({
      codigo: 'X',
      descricao: 'Y',
      ncm: '39191090',
      cfop: '5101',
      origem: '0',
      csosn: '102',
      cstPis: '01',
      cstCofins: '01',
      cclassTrib: '010001',
      cstIbsCbs: '000',
    });
    assert.ok(r.pendenciasReforma.some((p) => p.includes('diverge')));
  });

  it('exige CST IS quando sujeito a imposto seletivo', () => {
    const r = evaluateProdutoFiscal({
      codigo: 'X',
      descricao: 'Y',
      ncm: '22030000',
      cfop: '5102',
      origem: '0',
      csosn: '102',
      cstPis: '01',
      cstCofins: '01',
      cclassTrib: '010001',
      cstIbsCbs: '010',
      sujeitoIs: true,
    });
    assert.ok(r.pendenciasReforma.some((p) => p.includes('Seletivo')));
  });
});
