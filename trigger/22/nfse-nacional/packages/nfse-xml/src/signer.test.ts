import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { DpsBuilder } from './builders.js';
import { CertificadoProvider, NFSE_XMLDSIG } from './signer.js';
import { IdentificadorDps } from '@nfse/domain';
import { dpsInfId } from './xml-utils.js';

const CERT_PATH = process.env.NFSE_CERT_PATH ?? 'secrets/certificado.pfx';
const CERT_PASSWORD_FILE = process.env.NFSE_CERT_PASSWORD_FILE ?? 'secrets/certificado.senha';

describe('XmlSigner', () => {
  it('usa algoritmos XMLDSig do padrão nacional (WithComments + exc-c14n na Reference)', () => {
    if (!existsSync(CERT_PATH) || !existsSync(CERT_PASSWORD_FILE)) {
      return;
    }

    const id = IdentificadorDps.create({
      codigoMunicipio: '3170206',
      tipoInscricao: '2',
      inscricaoFederal: '53369941000163',
      serie: '70000',
      numeroDps: '7',
    }).toString();

    const xml = new DpsBuilder().build({
      idDps: id,
      numeroDps: '7',
      serie: '70000',
      cnpjPrestador: '53369941000163',
      razaoSocial: 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
      codigoMunicipio: '3170206',
      tpAmb: '1',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '49954731000165', razaoSocial: 'TOMADOR TESTE' },
        servico: {
          codigoServico: '170202',
          descricao: 'teste assinatura',
          codigoMunicipioIncidencia: '3170206',
          codigoNbs: '118064000',
        },
        valores: { valorServico: 1 },
        opSimpNac: '3',
        regApTribSN: '1',
      },
    });

    const cert = CertificadoProvider.create({
      certPath: CERT_PATH,
      certPasswordFile: CERT_PASSWORD_FILE,
      cnpj: '53369941000163',
      govMock: false,
      certRequired: true,
    });

    const signed = cert.assinarXml(xml, dpsInfId(id));
    const sig = signed.match(/<Signature[\s\S]*?<\/Signature>/)?.[0] ?? '';

    assert.ok(sig.includes(`Algorithm="${NFSE_XMLDSIG.canonicalization}"`));
    assert.ok(sig.includes(`Algorithm="${NFSE_XMLDSIG.signature}"`));
    assert.ok(sig.includes(`Algorithm="${NFSE_XMLDSIG.transforms[1]}"`));
    assert.ok(sig.includes(`URI="#${dpsInfId(id)}"`));
    assert.ok(signed.includes(`</infDPS><Signature`));
    assert.ok(!signed.includes('<Signature xmlns') || signed.indexOf('<Signature') > signed.indexOf('<infDPS'));
  });
});
