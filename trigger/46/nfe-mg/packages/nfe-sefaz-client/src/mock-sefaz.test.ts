import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockSefazAdapter } from './mock-sefaz.js';
import { NfeBuilder, wrapEnviNFe, XmlSigner, nfeInfId } from '@nfe/xml';
import { gerarChaveAcesso, type Emitente, type EmitirNfeInput } from '@nfe/domain';

const emitente = {
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
} satisfies Emitente;

const input: EmitirNfeInput = {
  naturezaOperacao: 'VENDA',
  destinatario: {
    tipo: 'PJ',
    cpfCnpj: '98765432000100',
    razaoSocial: 'DEST',
    indIEDest: '9',
    endereco: {
      logradouro: 'RUA A',
      numero: '1',
      bairro: 'CENTRO',
      codigoMunicipio: '3106200',
      municipio: 'BELO HORIZONTE',
      uf: 'MG',
      cep: '30120000',
    },
  },
  itens: [{
    codigo: '1',
    descricao: 'P',
    ncm: '84713012',
    cfop: '5102',
    unidade: 'UN',
    quantidade: 1,
    valorUnitario: 10,
  }],
};

test('mock autoriza e consulta protocolo', async () => {
  const sefaz = new MockSefazAdapter();
  const status = await sefaz.statusServico('2');
  assert.equal(status.cStat, '107');

  const chave = gerarChaveAcesso({
    aamm: '2608', cnpj: emitente.cnpj, serie: 1, numero: 9, cNF: '22222222',
  });
  let xml = new NfeBuilder().build({
    chaveAcesso: chave, cNF: '22222222', cDV: chave.slice(-1),
    serie: 1, numero: 9, emitente, input, tpAmb: '2',
  });
  xml = XmlSigner.createMock().assinarXml(xml, nfeInfId(chave));
  const envi = wrapEnviNFe(xml, '1');
  const auth = await sefaz.autorizar(envi, '2');
  assert.equal(auth.cStat, '100');
  assert.equal(auth.chaveAcesso, chave);

  const cons = await sefaz.consultarProtocolo(chave, '2');
  assert.equal(cons.cStat, '100');
});
