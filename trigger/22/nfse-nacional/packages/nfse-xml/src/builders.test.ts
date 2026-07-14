import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gzipBase64, gunzipBase64, DpsBuilder } from './builders.js';
import { NfseXmlBuilder } from './nfse-builder.js';
import { parseNfseXml } from './nfse-parser.js';
import { dpsInfId } from './xml-utils.js';

describe('gzipBase64', () => {
  it('roundtrip compress/decompress', () => {
    const xml = '<test>hello</test>';
    const encoded = gzipBase64(xml);
    assert.equal(gunzipBase64(encoded), xml);
  });
});

describe('DpsBuilder', () => {
  it('gera XML com infDPS e regTrib', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: { codigoServico: '010701', descricao: 'Servico teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<DPS'));
    assert.ok(xml.includes(`Id="${dpsInfId('3550308212345678000199000010000000000000001')}"`));
    assert.ok(xml.includes('<regTrib>'));
    assert.ok(xml.includes('<nDPS>1</nDPS>'));
    assert.ok(xml.includes('12345678000199'));
    assert.ok(xml.includes('versao="1.01"'));
    assert.ok(!/<prest>[\s\S]*<xNome>/.test(xml));
    assert.ok(!xml.includes('<cPaisPrestacao>'));
    assert.ok(xml.includes('<tribFed>'));
    assert.ok(xml.includes('<CST>00</CST>'));
  });

  it('inclui cTribMun e contato do tomador quando informados', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      prestadorEmail: 'emit@empresa.com',
      prestadorTelefone: '11999998888',
      tpAmb: '2',
      input: {
        tomador: {
          tipo: 'PJ',
          cpfCnpj: '98765432000100',
          razaoSocial: 'Tomador',
          email: 'tom@empresa.com',
          telefone: '11888887777',
          endereco: {
            logradouro: 'Rua A',
            numero: '100',
            bairro: 'Centro',
            codigoMunicipio: '3550308',
            uf: 'SP',
            cep: '01001000',
          },
        },
        servico: {
          codigoServico: '010701',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
          codigoTributacaoMunicipal: '12345',
        },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<cTribMun>12345</cTribMun>'));
    assert.ok(xml.includes('<email>emit@empresa.com</email>'));
    assert.ok(xml.includes('<email>tom@empresa.com</email>'));
    assert.ok(xml.includes('<fone>11888887777</fone>'));
    assert.ok(xml.includes('<cMun>3550308</cMun>'));
  });

  it('inclui cNBS quando codigoNbs informado', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: {
          codigoServico: '170202',
          codigoNbs: '118064000',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
        },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<cNBS>118064000</cNBS>'));
  });

  it('não inclui xInfComp quando discriminacao não informada', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: {
          codigoServico: '170202',
          descricao: 'Serviços de apoio administrativo',
          codigoMunicipioIncidencia: '3550308',
        },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<xDescServ>Serviços de apoio administrativo</xDescServ>'));
    assert.ok(!xml.includes('<xInfComp>'));
  });

  it('inclui xInfComp somente quando discriminacao informada', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: {
          codigoServico: '170202',
          descricao: 'Serviços de apoio administrativo',
          codigoMunicipioIncidencia: '3550308',
        },
        discriminacao: 'Consultoria mensal — referência março/2026',
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<infoCompl>'));
    assert.ok(xml.includes('<xInfComp>Consultoria mensal — referência março/2026</xInfComp>'));
    assert.ok(!xml.includes('<xInfComp>Serviços de apoio administrativo</xInfComp>'));
    assert.ok(!xml.includes('</valores>\n    <xInfComp>'));
  });

  it('não inclui pAliq quando alíquota não informada', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: { codigoServico: '010701', descricao: 'Servico teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(!xml.includes('<pAliq>'));
    assert.ok(!xml.includes('<vISSQN>'));
    assert.ok(!xml.includes('<vBC>'));
  });

  it('inclui pAliq quando alíquota informada', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: {
          codigoServico: '010701',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
          aliquotaIss: 3.5,
        },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<pAliq>3.50</pAliq>'));
    assert.ok(xml.includes('<vISSQN>35.00</vISSQN>'));
    assert.ok(xml.includes('<vBC>1000.00</vBC>'));
  });

  it('não inclui vBC quando tribISSQN não é operação tributável', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: {
          codigoServico: '010701',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
          tributacaoIssqn: '2',
          tipoImunidade: '1',
          aliquotaIss: 5,
        },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<tribISSQN>2</tribISSQN>'));
    assert.ok(!xml.includes('<vBC>'));
    assert.ok(!xml.includes('<pAliq>'));
  });

  it('inclui regEspTrib e tpRetISSQN do formulário', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        regimeEspecialTributacao: '3',
        servico: {
          codigoServico: '010701',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
          retencaoIssqn: '2',
        },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<regEspTrib>3</regEspTrib>'));
    assert.ok(xml.includes('<tpRetISSQN>2</tpRetISSQN>'));
  });

  it('inclui campos de tributação municipal quando informados', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: {
          codigoServico: '010701',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
          tributacaoIssqn: '2',
          tipoImunidade: '1',
          suspensaoExigibilidade: '1',
          numeroProcessoSuspensao: 'PROC-123',
          beneficioMunicipal: 'BM001',
        },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<tribISSQN>2</tribISSQN>'));
    assert.ok(xml.includes('<tpImunidade>1</tpImunidade>'));
    assert.ok(xml.includes('<nBM>BM001</nBM>'));
    assert.ok(xml.includes('<exigSusp>'));
    assert.ok(xml.includes('<tpSusp>1</tpSusp>'));
    assert.ok(xml.includes('<nProcesso>PROC-123</nProcesso>'));
  });

  it('inclui tribFed com campos federais quando informados', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: {
          codigoServico: '010701',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
          tpRetPisCofins: '3',
        },
        valores: {
          valorServico: 1000,
          valorIr: 10,
          valorInss: 20,
          valorCsll: 120,
          valorPis: 5.5,
          valorCofins: 25.3,
        },
      },
    });
    assert.ok(xml.includes('<tribFed>'));
    assert.ok(xml.includes('<vRetIRRF>10.00</vRetIRRF>'));
    assert.ok(xml.includes('<vRetCP>20.00</vRetCP>'));
    assert.ok(xml.includes('<vRetCSLL>120.00</vRetCSLL>'));
    assert.ok(xml.includes('<tpRetPisCofins>3</tpRetPisCofins>'));
    assert.ok(xml.includes('<vPis>5.50</vPis>'));
    assert.ok(xml.includes('<vCofins>25.30</vCofins>'));
    assert.ok(xml.includes('<CST>00</CST>'));
  });

  it('inclui tribFed mínimo com CST 00 como emissor oficial', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: { codigoServico: '010701', descricao: 'Servico teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<tribFed>'));
    assert.ok(xml.includes('<piscofins>'));
    assert.ok(xml.includes('<CST>00</CST>'));
    assert.ok(!xml.includes('<vRetIRRF>'));
  });

  it('inclui IM do tomador quando informada', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: {
          tipo: 'PJ',
          cpfCnpj: '98765432000100',
          razaoSocial: 'Tomador',
          inscricaoMunicipal: '123456',
        },
        servico: { codigoServico: '010701', descricao: 'Servico teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<IM>123456</IM>'));
  });

  it('inclui regTrib configurável e totTrib por alíquota SN', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        opSimpNac: '3',
        regApTribSN: '2',
        totTrib: { modo: 'aliquota_sn', aliquotaSimplesNacional: 6.5 },
        servico: { codigoServico: '010701', descricao: 'Servico teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<opSimpNac>3</opSimpNac>'));
    assert.ok(xml.includes('<regApTribSN>2</regApTribSN>'));
    assert.ok(xml.includes('<pTotTribSN>6.50</pTotTribSN>'));
  });

  it('inclui descontos, vReceb e totTrib monetário', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        opSimpNac: '1',
        totTrib: {
          modo: 'valores',
          valorFederal: 10,
          valorEstadual: 5,
          valorMunicipal: 20,
        },
        servico: {
          codigoServico: '010701',
          descricao: 'Servico teste',
          codigoMunicipioIncidencia: '3550308',
          aliquotaIss: 5,
        },
        valores: {
          valorServico: 1000,
          valorRecebidoIntermediario: 100,
          descontoIncondicionado: 50,
          descontoCondicionado: 25,
        },
      },
    });
    assert.ok(xml.includes('<vReceb>100.00</vReceb>'));
    assert.ok(xml.includes('<vDescCondIncond>'));
    assert.ok(xml.includes('<vDescIncond>50.00</vDescIncond>'));
    assert.ok(xml.includes('<vDescCond>25.00</vDescCond>'));
    assert.ok(xml.includes('<vTotTribFed>10.00</vTotTribFed>'));
    assert.ok(xml.includes('<vBC>950.00</vBC>'));
    assert.ok(!xml.includes('<regApTribSN>'));
  });

  it('inclui totTrib percentual', () => {
    const builder = new DpsBuilder();
    const xml = builder.build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        totTrib: {
          modo: 'percentuais',
          percentualFederal: 1.5,
          percentualEstadual: 0,
          percentualMunicipal: 2.5,
        },
        servico: { codigoServico: '010701', descricao: 'Servico teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 1000 },
      },
    });
    assert.ok(xml.includes('<pTotTrib>'));
    assert.ok(xml.includes('<pTotTribFed>1.50</pTotTribFed>'));
    assert.ok(xml.includes('<pTotTribMun>2.50</pTotTribMun>'));
  });
});

describe('NfseXmlBuilder', () => {
  it('gera NFSe válida com DPS embutida', () => {
    const dps = new DpsBuilder().build({
      idDps: '3550308212345678000199000010000000000000001',
      numeroDps: '1',
      serie: '00001',
      cnpjPrestador: '12345678000199',
      razaoSocial: 'Empresa Teste',
      codigoMunicipio: '3550308',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '98765432000100', razaoSocial: 'Tomador' },
        servico: { codigoServico: '010701', descricao: 'Servico teste', codigoMunicipioIncidencia: '3550308' },
        valores: { valorServico: 1000 },
      },
    });

    const nfse = new NfseXmlBuilder().build({
      signedDpsXml: dps,
      chaveAcesso: 'A'.repeat(50),
      nNfse: '1',
      nDFSe: '1',
      xLocEmi: 'São Paulo - SP',
      xLocPrestacao: 'São Paulo - SP',
      xLocIncid: 'São Paulo - SP',
      xTribNac: 'Servico teste',
      valores: { vBC: 1000, pAliqAplic: 5, vISSQN: 50, vLiq: 1000, vServico: 1000 },
      emit: { cnpj: '12345678000199', razaoSocial: 'Empresa Teste' },
    });

    assert.ok(nfse.includes('<NFSe'));
    assert.ok(nfse.includes('</NFSe>'));
    assert.ok(nfse.includes('<infNFSe'));
    assert.ok(nfse.includes('</infNFSe>'));
    assert.ok(nfse.includes('<chNFSe>'));
    assert.ok(!nfse.includes('</infDPS></NFSe>'));
    assert.ok(nfse.includes('<DPS versao="1.01">'));

    const parsed = parseNfseXml(nfse, 'A'.repeat(50));
    assert.equal(parsed.chaveAcesso, 'A'.repeat(50));
    assert.equal(parsed.valores.valorServico, 1000);
  });
});

describe('DpsBuilder — alinhamento XML oficial', () => {
  it('replica estrutura do exemplo oficial Uberlândia (prest sem xNome, nDPS simples)', () => {
    const idDps = '317020625336994100016370000000000000000005';
    const xml = new DpsBuilder().build({
      idDps,
      numeroDps: '5',
      serie: '70000',
      cnpjPrestador: '53369941000163',
      razaoSocial: 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
      codigoMunicipio: '3170206',
      tpAmb: '1',
      prestadorEmail: 'diogo.moura@triggerti.com',
      prestadorTelefone: '34999909660',
      optanteSimples: true,
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '51124668000181', razaoSocial: 'NEUON CONSULTORIA EM GESTAO LTDA' },
        servico: {
          codigoServico: '170202',
          descricao: 'SERVICOS ESPECIALIZADOS DE APOIO EM INFRAESTRUTURA ADMINISTRATIVA',
          codigoMunicipioIncidencia: '3170206',
          codigoNbs: '118064000',
        },
        valores: { valorServico: 4484 },
        opSimpNac: '3',
        regApTribSN: '1',
      },
    });

    assert.ok(xml.includes(`Id="${dpsInfId(idDps)}"`));
    assert.ok(xml.includes('<nDPS>5</nDPS>'));
    assert.ok(xml.includes('<prest>\n      <CNPJ>53369941000163</CNPJ>'));
    assert.ok(xml.includes('<regTrib>'));
    assert.ok(!/<prest>[\s\S]*<xNome>/.test(xml));
    assert.ok(xml.includes('<locPrest>\n        <cLocPrestacao>3170206</cLocPrestacao>\n      </locPrest>'));
    assert.ok(!xml.includes('<cPaisPrestacao>'));
    assert.ok(xml.includes('<opSimpNac>3</opSimpNac>'));
    assert.ok(xml.includes('<cNBS>118064000</cNBS>'));
  });

  it('ordem toma conforme XSD: end antes de fone/email (exemplo oficial nº 8)', () => {
    const xml = new DpsBuilder().build({
      idDps: '317020625336994100016370000000000000000007',
      numeroDps: '7',
      serie: '70000',
      cnpjPrestador: '53369941000163',
      razaoSocial: 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
      codigoMunicipio: '3170206',
      tpAmb: '1',
      input: {
        tomador: {
          tipo: 'PJ',
          cpfCnpj: '49954731000165',
          razaoSocial: 'G AUGUSTO RODRIGUES COSTA',
          email: 'tomador@exemplo.com',
          telefone: '34999998888',
          endereco: {
            logradouro: 'ASPIRANTE MEGA',
            numero: '1083',
            complemento: 'APT 402',
            bairro: 'JARAGUA',
            codigoMunicipio: '3170206',
            uf: 'MG',
            cep: '38413018',
          },
        },
        servico: {
          codigoServico: '170202',
          descricao: 'teste',
          codigoMunicipioIncidencia: '3170206',
          codigoNbs: '118064000',
        },
        valores: { valorServico: 1 },
        opSimpNac: '3',
        regApTribSN: '1',
      },
    });

    const toma = xml.match(/<toma>[\s\S]*?<\/toma>/)?.[0] ?? '';
    const endPos = toma.indexOf('<end>');
    const fonePos = toma.indexOf('<fone>');
    const emailPos = toma.indexOf('<email>');
    assert.ok(endPos >= 0, 'end ausente');
    assert.ok(fonePos > endPos, 'fone deve vir após end');
    assert.ok(emailPos > endPos, 'email deve vir após end');
  });
});
