import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNfseXml } from '@nfse/xml';
import {
  fmtNomePrefeitura,
  fmtTelefonePrefeitura,
  resolveCodigoMunicipioEmissor,
  resolvePrefeituraCabecalho,
} from './prefeitura-cabecalho.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_XML = join(__dirname, '../../../docs/example/oficial-31702062253369941000163000000000000626050264633732(1).xml');

const PREFETURA_SLOT_W = 122;
const PREFETURA_SLOT_PAD = 2;

function fitPrefeituraLine(doc: PDFKit.PDFDocument, text: string, baseSize: number): number {
  const slotW = PREFETURA_SLOT_W - PREFETURA_SLOT_PAD;
  let size = baseSize;
  doc.font('Courier');
  while (size > 4.5 && doc.fontSize(size).widthOfString(text) > slotW) {
    size -= 0.25;
  }
  return size;
}

function assertSingleLine(doc: PDFKit.PDFDocument, text: string, baseSize: number): void {
  const size = fitPrefeituraLine(doc, text, baseSize);
  doc.font('Courier').fontSize(size);
  const height = doc.heightOfString(text, { width: PREFETURA_SLOT_W, lineGap: 0 });
  assert.ok(height <= size + 1.5, `"${text}" quebrou linha no cabeçalho`);
}

describe('prefeitura-cabecalho', () => {
  const savedContatos = process.env.NFSE_PREFEITURA_CONTATOS;
  const savedTelefone = process.env.NFSE_PREFEITURA_TELEFONE;
  const savedEmail = process.env.NFSE_PREFEITURA_EMAIL;
  const savedMun = process.env.NFSE_C_MUN_EMISSOR;

  beforeEach(() => {
    delete process.env.NFSE_PREFEITURA_CONTATOS;
    delete process.env.NFSE_PREFEITURA_TELEFONE;
    delete process.env.NFSE_PREFEITURA_EMAIL;
    delete process.env.NFSE_C_MUN_EMISSOR;
  });

  afterEach(() => {
    if (savedContatos === undefined) delete process.env.NFSE_PREFEITURA_CONTATOS;
    else process.env.NFSE_PREFEITURA_CONTATOS = savedContatos;
    if (savedTelefone === undefined) delete process.env.NFSE_PREFEITURA_TELEFONE;
    else process.env.NFSE_PREFEITURA_TELEFONE = savedTelefone;
    if (savedEmail === undefined) delete process.env.NFSE_PREFEITURA_EMAIL;
    else process.env.NFSE_PREFEITURA_EMAIL = savedEmail;
    if (savedMun === undefined) delete process.env.NFSE_C_MUN_EMISSOR;
    else process.env.NFSE_C_MUN_EMISSOR = savedMun;
  });

  it('formata nome da prefeitura', () => {
    assert.equal(fmtNomePrefeitura('Uberlândia'), 'Prefeitura Municipal de Uberlândia');
    assert.equal(fmtNomePrefeitura('Prefeitura Municipal de Campinas'), 'Prefeitura Municipal de Campinas');
  });

  it('formata telefone compacto do cabeçalho', () => {
    assert.equal(fmtTelefonePrefeitura('3432393130'), '(34)3239-3130');
  });

  it('resolve código IBGE do município emissor a partir do XML oficial', () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const doc = parseNfseXml(xml);
    assert.equal(resolveCodigoMunicipioEmissor(doc), '3170206');
  });

  it('resolve cabeçalho Uberlândia com contatos do cadastro local', async () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const doc = parseNfseXml(xml);
    const cabecalho = await resolvePrefeituraCabecalho(doc);

    assert.equal(cabecalho?.nome, 'Prefeitura Municipal de Uberlândia');
    assert.equal(cabecalho?.telefone, '(34)3239-3130');
    assert.equal(cabecalho?.email, 'notafiscal@uberlandia.mg.gov.br');
  });

  it('permite override de contatos via NFSE_PREFEITURA_CONTATOS', async () => {
    process.env.NFSE_PREFEITURA_CONTATOS = JSON.stringify({
      '3170206': { telefone: '11999998888', email: 'fiscal@teste.gov.br' },
    });

    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const doc = parseNfseXml(xml);
    const cabecalho = await resolvePrefeituraCabecalho(doc);

    assert.equal(cabecalho?.telefone, '(11)99999-8888');
    assert.equal(cabecalho?.email, 'fiscal@teste.gov.br');
  });

  it('cabeçalho Uberlândia cabe em uma linha por campo (sem quebra)', async () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const cabecalho = await resolvePrefeituraCabecalho(parseNfseXml(xml));
    assert.ok(cabecalho);

    const doc = new PDFDocument();
    assertSingleLine(doc, cabecalho!.nome, 6);
    if (cabecalho!.telefone) assertSingleLine(doc, cabecalho!.telefone, 5.5);
    if (cabecalho!.email) assertSingleLine(doc, cabecalho!.email, 5.5);
  });

  it('resolve nome da prefeitura quando xLocEmi contém código IBGE', async () => {
    const doc = parseNfseXml(readFileSync(EXAMPLE_XML, 'utf-8'));
    doc.xLocEmi = '3170206';

    const cabecalho = await resolvePrefeituraCabecalho(doc, {
      dadosMunicipio: async (code) => {
        assert.equal(code, '3170206');
        return { nome: 'Uberlândia', uf: 'MG' };
      },
    });

    assert.equal(cabecalho?.nome, 'Prefeitura Municipal de Uberlândia');
  });
});
