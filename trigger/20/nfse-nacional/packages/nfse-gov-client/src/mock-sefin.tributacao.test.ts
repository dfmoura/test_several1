import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { descricaoTributacaoNacional } from '@nfse/domain';
import { DpsBuilder, gzipBase64 } from '@nfse/xml';
import { parseNfseXml } from '@nfse/xml';
import { MockSefinAdapter } from './mock-sefin.js';

describe('MockSefinAdapter xTribNac', () => {
  it('preenche xTribNac com descrição oficial LC 116, não com xDescServ', async () => {
    const dps = new DpsBuilder().build({
      idDps: '317020653369941000163700000000000000000005',
      numeroDps: '5',
      serie: '70000',
      cnpjPrestador: '53369941000163',
      razaoSocial: 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA',
      codigoMunicipio: '3170206',
      tpAmb: '2',
      input: {
        tomador: { tipo: 'PJ', cpfCnpj: '51124668000181', razaoSocial: 'NEUON' },
        servico: {
          codigoServico: '170202',
          descricao: 'Serviços de apoio administrativo personalizado',
          codigoMunicipioIncidencia: '3170206',
        },
        valores: { valorServico: 4484 },
      },
    });

    const mock = new MockSefinAdapter();
    const { nfseXml } = await mock.emitir(gzipBase64(dps));
    const parsed = parseNfseXml(nfseXml);

    const descricaoOficial = descricaoTributacaoNacional('170202');
    assert.ok(descricaoOficial?.includes('Expediente'));
    assert.equal(parsed.servico.codigoTributacaoNacional, '170202');
    assert.equal(parsed.xTribNac, descricaoOficial);
    assert.notEqual(parsed.xTribNac, parsed.servico.descricao);
    assert.equal(parsed.valores.aliquotaIss, undefined);
    assert.equal(parsed.regTrib?.regEspTrib, '0');
  });
});
