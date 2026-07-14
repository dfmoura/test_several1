import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNfseXml } from './nfse-parser.js';
import { enrichNfseDocumentLocalidades, enrichNfseDocumentTributacao } from './nfse-display-enrichment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_XML = join(__dirname, '../../../docs/example/oficial-31702062253369941000163000000000000626050264633732(1).xml');

describe('enrichNfseDocumentLocalidades', () => {
  it('resolve nome e UF do tomador a partir do cMun (padrão DANFSe)', async () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const parsed = parseNfseXml(xml);

    assert.equal(parsed.tomador.endereco?.codigoMunicipio, '3170206');
    assert.equal(parsed.tomador.endereco?.nomeMunicipio, undefined);

    const enriched = await enrichNfseDocumentLocalidades(parsed, {
      dadosMunicipio: async (code) => {
        assert.equal(code, '3170206');
        return { nome: 'Uberlândia', uf: 'MG' };
      },
    });

    assert.equal(enriched.tomador.endereco?.nomeMunicipio, 'Uberlândia');
    assert.equal(enriched.tomador.endereco?.uf, 'MG');
    assert.equal(enriched.servico.ufMunicipioPrestacao, 'MG');
    assert.equal(enriched.ufMunicipioIncidencia, 'MG');
  });

  it('resolve UF do município de incidência via IBGE quando não coincide com endereços', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.codigoMunicipioIncidencia = '3550308';
    doc.prestador.endereco = { ...doc.prestador.endereco!, codigoMunicipio: '3170206', uf: 'MG' };
    doc.tomador.endereco = { ...doc.tomador.endereco!, codigoMunicipio: '3170206' };

    const enriched = await enrichNfseDocumentLocalidades(doc, {
      dadosMunicipio: async (code) => {
        if (code === '3170206') return { nome: 'Uberlândia', uf: 'MG' };
        if (code === '3550308') return { nome: 'São Paulo', uf: 'SP' };
        return null;
      },
    });

    assert.equal(enriched.ufMunicipioIncidencia, 'SP');
  });

  it('não altera município de incidência quando xLocIncid já inclui UF', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.xLocIncid = 'São Paulo - SP';

    const enriched = await enrichNfseDocumentLocalidades(doc, {
      dadosMunicipio: async () => {
        throw new Error('não deveria consultar IBGE');
      },
    });

    assert.equal(enriched.ufMunicipioIncidencia, undefined);
  });

  it('resolve UF do local de prestação via IBGE quando não coincide com endereços', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.servico.codigoMunicipioPrestacao = '3550308';
    doc.prestador.endereco = { ...doc.prestador.endereco!, codigoMunicipio: '3170206', uf: 'MG' };
    doc.tomador.endereco = { ...doc.tomador.endereco!, codigoMunicipio: '3170206' };

    const enriched = await enrichNfseDocumentLocalidades(doc, {
      dadosMunicipio: async (code) => {
        if (code === '3170206') return { nome: 'Uberlândia', uf: 'MG' };
        if (code === '3550308') return { nome: 'São Paulo', uf: 'SP' };
        return null;
      },
    });

    assert.equal(enriched.servico.ufMunicipioPrestacao, 'SP');
  });

  it('não altera local de prestação quando xLocPrestacao já inclui UF', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.xLocPrestacao = 'São Paulo - SP';

    const enriched = await enrichNfseDocumentLocalidades(doc, {
      dadosMunicipio: async () => {
        throw new Error('não deveria consultar IBGE');
      },
    });

    assert.equal(enriched.servico.ufMunicipioPrestacao, undefined);
  });

  it('não altera endereço quando nome e UF já estão presentes', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.tomador.endereco = {
      ...doc.tomador.endereco!,
      nomeMunicipio: 'Cidade Existente',
      uf: 'SP',
    };

    const enriched = await enrichNfseDocumentLocalidades(doc, {
      dadosMunicipio: async () => {
        throw new Error('não deveria consultar IBGE');
      },
    });

    assert.equal(enriched.tomador.endereco?.nomeMunicipio, 'Cidade Existente');
    assert.equal(enriched.tomador.endereco?.uf, 'SP');
  });

  it('resolve nome de incidência a partir do código IBGE quando xLocIncid está ausente', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.xLocIncid = undefined;
    doc.codigoMunicipioIncidencia = '3550308';
    doc.prestador.endereco = { ...doc.prestador.endereco!, codigoMunicipio: '3170206', uf: 'MG' };
    doc.tomador.endereco = { ...doc.tomador.endereco!, codigoMunicipio: '3170206' };

    const enriched = await enrichNfseDocumentLocalidades(doc, {
      dadosMunicipio: async (code) => {
        if (code === '3550308') return { nome: 'São Paulo', uf: 'SP' };
        if (code === '3170206') return { nome: 'Uberlândia', uf: 'MG' };
        return null;
      },
    });

    assert.equal(enriched.xLocIncid, 'São Paulo');
    assert.equal(enriched.ufMunicipioIncidencia, 'SP');
  });

  it('substitui xLocEmi numérico (IBGE) pelo nome do município', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.xLocEmi = '3170206';

    const enriched = await enrichNfseDocumentLocalidades(doc, {
      dadosMunicipio: async (code) => {
        assert.equal(code, '3170206');
        return { nome: 'Uberlândia', uf: 'MG' };
      },
    });

    assert.equal(enriched.xLocEmi, 'Uberlândia');
  });
});

describe('enrichNfseDocumentTributacao', () => {
  it('preenche xTribNac a partir do código quando ausente no XML', () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const parsed = parseNfseXml(xml);
    parsed.xTribNac = undefined;

    const enriched = enrichNfseDocumentTributacao(parsed);

    assert.ok(enriched.xTribNac?.includes('Expediente'));
  });

  it('mantém xTribNac oficial quando já presente', () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const parsed = parseNfseXml(xml);
    const original = parsed.xTribNac;

    const enriched = enrichNfseDocumentTributacao(parsed);

    assert.equal(enriched.xTribNac, original);
  });

  it('corrige xTribNac quando contém xDescServ em vez da descrição LC 116', () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const parsed = parseNfseXml(xml);
    parsed.xTribNac = parsed.servico.descricao;

    const enriched = enrichNfseDocumentTributacao(parsed);

    assert.ok(enriched.xTribNac?.includes('Expediente'));
    assert.notEqual(enriched.xTribNac, parsed.servico.descricao);
  });
});
