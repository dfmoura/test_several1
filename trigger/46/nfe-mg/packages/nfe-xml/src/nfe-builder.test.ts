import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NfeBuilder, wrapEnviNFe, wrapProcNFe } from './nfe-builder.js';
import { parseNfeXml } from './nfe-parser.js';
import { XmlSigner } from './signer.js';
import { nfeInfId } from './xml-utils.js';
import type { Emitente, EmitirNfeInput } from '@nfe/domain';
import { gerarChaveAcesso } from '@nfe/domain';

const emitente: Emitente = {
  id: 'e1',
  apelido: 'piloto',
  cnpj: '12345678000199',
  inscricaoEstadual: '0623079040081',
  razaoSocial: 'EMPRESA PILOTO LTDA',
  crt: '1',
  endereco: {
    logradouro: 'AV AFONSO PENA',
    numero: '1000',
    bairro: 'CENTRO',
    codigoMunicipio: '3106200',
    municipio: 'BELO HORIZONTE',
    uf: 'MG',
    cep: '30130000',
  },
  ambiente: 'homolog',
  seriePadrao: 1,
  ultimoNumero: 0,
  credenciadoSiare: false,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const input: EmitirNfeInput = {
  naturezaOperacao: 'VENDA DE MERCADORIA',
  destinatario: {
    tipo: 'PJ',
    cpfCnpj: '98765432000100',
    razaoSocial: 'DESTINATARIO LTDA',
    indIEDest: '9',
    endereco: {
      logradouro: 'RUA TESTE',
      numero: '10',
      bairro: 'CENTRO',
      codigoMunicipio: '3106200',
      municipio: 'BELO HORIZONTE',
      uf: 'MG',
      cep: '30120000',
    },
  },
  itens: [
    {
      codigo: 'SKU-1',
      descricao: 'Produto teste',
      ncm: '84713012',
      cfop: '5102',
      unidade: 'UN',
      quantidade: 2,
      valorUnitario: 100,
    },
  ],
};

test('builder gera infNFe 4.00 com chave válida', () => {
  const chave = gerarChaveAcesso({
    aamm: '2608',
    cnpj: emitente.cnpj,
    serie: 1,
    numero: 1,
    cNF: '11111111',
  });
  const xml = new NfeBuilder().build({
    chaveAcesso: chave,
    cNF: '11111111',
    cDV: chave.slice(-1),
    serie: 1,
    numero: 1,
    emitente,
    input,
    tpAmb: '2',
  });
  assert.match(xml, /versao="4.00"/);
  assert.match(xml, new RegExp(`Id="NFe${chave}"`));
  assert.match(xml, /<mod>55<\/mod>/);
  assert.match(xml, /<tpAmb>2<\/tpAmb>/);
  assert.match(xml, /<CRT>1<\/CRT>/);
  assert.match(xml, /<CSOSN>102<\/CSOSN>/);
  assert.match(xml, /<vNF>200.00<\/vNF>/);
  assert.match(xml, /NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO/);

  const signed = XmlSigner.createMock().assinarXml(xml, nfeInfId(chave));
  assert.match(signed, /SignatureValue>MOCK/);

  const envi = wrapEnviNFe(signed, '1');
  assert.match(envi, /<enviNFe/);
  assert.match(envi, /<indSinc>1<\/indSinc>/);

  const proc = wrapProcNFe(signed, '131260000000001', '2026-08-26T12:00:00-03:00');
  assert.match(proc, /<nfeProc/);
  assert.match(proc, /<cStat>100<\/cStat>/);

  const parsed = parseNfeXml(xml, chave);
  assert.equal(parsed.chaveAcesso, chave);
  assert.equal(parsed.itens.length, 1);
  assert.equal(parsed.emitCnpj, '12345678000199');
});
