import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNfseXml } from './nfse-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_XML = join(__dirname, '../../../docs/example/oficial-31702062253369941000163000000000000626050264633732(1).xml');

describe('parseNfseXml — exemplo produção', () => {
  it('extrai campos do XML real em docs/example', () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const parsed = parseNfseXml(xml);

    assert.equal(parsed.chaveAcesso, '31702062253369941000163000000000000626050264633732');
    assert.equal(parsed.versao, '1.01');
    assert.equal(parsed.nNfse, '6');
    assert.equal(parsed.nDFSe, '8481809');
    assert.equal(parsed.xLocEmi, 'Uberlândia');
    assert.equal(parsed.xLocPrestacao, 'Uberlândia');
    assert.equal(parsed.xLocIncid, 'Uberlândia');
    assert.equal(parsed.codigoMunicipioIncidencia, '3170206');
    assert.equal(parsed.prestador.cnpj, '53369941000163');
    assert.equal(parsed.prestador.razaoSocial, 'TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA');
    assert.equal(parsed.prestador.endereco?.logradouro, 'AVENIDA ARAGUARI');
    assert.equal(parsed.prestador.endereco?.uf, 'MG');
    assert.equal(parsed.tomador.cnpj, '51124668000181');
    assert.equal(parsed.tomador.razaoSocial, 'NEUON CONSULTORIA EM GESTAO LTDA');
    assert.equal(parsed.tomador.endereco?.logradouro, 'SUDEPE');
    assert.equal(parsed.tomador.endereco?.complemento, 'BLOCO 01 APTO 401');
    assert.equal(parsed.tomador.endereco?.codigoMunicipio, '3170206');
    assert.equal(parsed.servico.codigoTributacaoNacional, '170202');
    assert.equal(parsed.servico.descricao?.includes('INFRAESTRUTURA ADMINISTRATIVA'), true);
    assert.equal(parsed.valores.valorServico, 4484);
    assert.equal(parsed.valores.valorLiquido, 4484);
    assert.equal(parsed.regTrib?.opSimpNac, '3');
    assert.equal(parsed.regTrib?.regApTribSN, '1');
    assert.equal(parsed.tributacao?.tribISSQN, '1');
    assert.equal(parsed.tributacao?.tpRetISSQN, '1');
    assert.equal(parsed.tributacao?.pTotTribSN, 6);
    assert.equal(parsed.valores.aliquotaIss, undefined);
    assert.equal(parsed.valores.baseCalculo, undefined);
    assert.equal(parsed.valores.valorIss, undefined);
    assert.equal(parsed.regTrib?.regEspTrib, '0');
    assert.equal(parsed.dps?.numero, '5');
    assert.equal(parsed.dps?.serie, '70000');
  });

  it('extrai cPaisConsum quando presente no XML', () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8').replace(
      '</cLocPrestacao>',
      '</cLocPrestacao><cPaisConsum>105</cPaisConsum>',
    );
    const parsed = parseNfseXml(xml);
    assert.equal(parsed.servico.codigoPaisResultado, '105');
  });
});
