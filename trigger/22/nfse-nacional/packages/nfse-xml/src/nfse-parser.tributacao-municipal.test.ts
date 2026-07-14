import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNfseXml } from './nfse-parser.js';

const XML_TRIB_MUN = `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="DPS1">
    <valores>
      <vServPrest><vServ>1000.00</vServ></vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>2</tribISSQN>
          <tpRetISSQN>1</tpRetISSQN>
          <tpImunidade>3</tpImunidade>
          <nBM>98765</nBM>
          <exigSusp>
            <tpSusp>2</tpSusp>
            <nProcesso>ADM-2026-001</nProcesso>
          </exigSusp>
          <pAliq>5.00</pAliq>
          <vBC>1000.00</vBC>
          <vISSQN>50.00</vISSQN>
        </tribMun>
      </trib>
    </valores>
  </infDPS>
</DPS>`;

describe('parseNfseXml — tributação municipal', () => {
  it('extrai tpImunidade, nBM, exigSusp e valores de ISS quando informados', () => {
    const parsed = parseNfseXml(XML_TRIB_MUN);
    assert.equal(parsed.tributacao?.tribISSQN, '2');
    assert.equal(parsed.tributacao?.tpImunidade, '3');
    assert.equal(parsed.tributacao?.nBM, '98765');
    assert.equal(parsed.tributacao?.suspensaoExigibilidade, '2');
    assert.equal(parsed.tributacao?.numeroProcessoSuspensao, 'ADM-2026-001');
    assert.equal(parsed.valores.baseCalculo, 1000);
    assert.equal(parsed.valores.aliquotaIss, 5);
    assert.equal(parsed.valores.valorIss, 50);
  });

  it('não infere BC ISSQN a partir do valor do serviço quando vBC está ausente', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infNFSe Id="NFS1">
    <valores><vServico>4484.00</vServico><vLiq>4484.00</vLiq></valores>
    <DPS versao="1.00"><infDPS><valores><vServPrest><vServ>4484.00</vServ></vServPrest>
      <trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun></trib>
    </valores></infDPS></DPS>
  </infNFSe>
</NFSe>`;
    const parsed = parseNfseXml(xml);
    assert.equal(parsed.valores.valorServico, 4484);
    assert.equal(parsed.valores.baseCalculo, undefined);
    assert.equal(parsed.valores.aliquotaIss, undefined);
    assert.equal(parsed.valores.valorIss, undefined);
  });
});
