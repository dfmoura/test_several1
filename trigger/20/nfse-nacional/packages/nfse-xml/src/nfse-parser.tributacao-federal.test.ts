import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNfseXml } from './nfse-parser.js';

const TRIB_FED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe versao="1.01" xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFS31702062253369941000163000000000000626050264633732">
    <valores><vServico>1000.00</vServico><vLiq>900.00</vLiq><vTotalRet>150.00</vTotalRet></valores>
    <DPS><infDPS>
      <valores>
        <vServPrest><vServ>1000.00</vServ></vServPrest>
        <trib>
          <tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>
          <tribFed>
            <vRetIRRF>10.00</vRetIRRF>
            <vRetCP>20.00</vRetCP>
            <vRetCSLL>120.00</vRetCSLL>
            <piscofins>
              <CST>00</CST>
              <tpRetPisCofins>3</tpRetPisCofins>
              <vPis>5.50</vPis>
              <vCofins>25.30</vCofins>
            </piscofins>
          </tribFed>
        </trib>
      </valores>
    </infDPS></DPS>
  </infNFSe>
</NFSe>`;

describe('parseNfseXml — tributação federal', () => {
  it('mapeia campos tribFed conforme layout oficial', () => {
    const parsed = parseNfseXml(TRIB_FED_XML);

    assert.equal(parsed.valores.valorIr, 10);
    assert.equal(parsed.valores.valorInss, 20);
    assert.equal(parsed.valores.valorCsll, 120);
    assert.equal(parsed.valores.valorPis, 5.5);
    assert.equal(parsed.valores.valorCofins, 25.3);
    assert.equal(parsed.tributacao?.tpRetPisCofins, '3');
    assert.equal(parsed.valores.valorTotalRetido, 150);
  });

  it('omite valores federais ausentes no XML', () => {
    const xml = TRIB_FED_XML.replace('<vRetIRRF>10.00</vRetIRRF>', '');
    const parsed = parseNfseXml(xml);
    assert.equal(parsed.valores.valorIr, undefined);
  });
});
