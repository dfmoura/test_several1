import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNfseXml } from '@nfse/xml';
import { fmtLocalIncidencia, fmtLocalPrestacao, fmtPaisResultado } from './danfse-formatters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_XML = join(__dirname, '../../../docs/example/oficial-31702062253369941000163000000000000626050264633732(1).xml');

describe('fmtLocalPrestacao / fmtLocalIncidencia', () => {
  it('formata município e UF a partir do endereço do prestador (XML oficial)', () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));

    assert.equal(fmtLocalPrestacao(doc), 'Uberlândia - MG');
    assert.equal(fmtLocalIncidencia(doc), 'Uberlândia - MG');
  });

  it('mantém valor quando já inclui UF', () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.xLocPrestacao = 'São Paulo - SP';
    doc.xLocIncid = 'Rio de Janeiro - RJ';

    assert.equal(fmtLocalPrestacao(doc), 'São Paulo - SP');
    assert.equal(fmtLocalIncidencia(doc), 'Rio de Janeiro - RJ');
  });
});

describe('fmtPaisResultado', () => {
  it('exibe Brasil para XML oficial sem cPaisConsum (operação tributável nacional)', () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    assert.equal(doc.servico.codigoPaisResultado, undefined);
    assert.equal(fmtPaisResultado(doc), 'Brasil');
  });

  it('usa código do XML quando cPaisConsum está presente', () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.servico.codigoPaisResultado = '105';
    assert.equal(fmtPaisResultado(doc), 'Brasil');
  });

  it('retorna vazio para exportação sem país informado', () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.tributacao = { ...doc.tributacao, tribISSQN: '3' };
    assert.equal(fmtPaisResultado(doc), '');
  });
});

describe('labelTipoImunidade / labelSuspensaoExigibilidade', () => {
  it('formata campos de tributação municipal para DANFSe', async () => {
    const { labelTipoImunidade, labelSuspensaoExigibilidade, fmtBeneficioMunicipal } = await import('./danfse-formatters.js');
    assert.equal(labelSuspensaoExigibilidade(undefined), 'Não');
    assert.ok(labelTipoImunidade('2').includes('Templos'));
    assert.equal(fmtBeneficioMunicipal('  BM99  '), 'BM99');
  });
});

describe('totalPisCofinsRetidos', () => {
  it('usa vRetCSLL quando há retenção de contribuições sociais', async () => {
    const { totalPisCofinsRetidos } = await import('./danfse-formatters.js');
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.tributacao = { ...doc.tributacao, tpRetPisCofins: '3' };
    doc.valores.valorCsll = 150;
    doc.valores.valorPis = 10;
    doc.valores.valorCofins = 20;
    assert.equal(totalPisCofinsRetidos(doc), 150);
  });

  it('retorna zero quando tpRetPisCofins indica não retido', async () => {
    const { totalPisCofinsRetidos } = await import('./danfse-formatters.js');
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.tributacao = { ...doc.tributacao, tpRetPisCofins: '0' };
    doc.valores.valorCsll = 150;
    assert.equal(totalPisCofinsRetidos(doc), 0);
  });
});
