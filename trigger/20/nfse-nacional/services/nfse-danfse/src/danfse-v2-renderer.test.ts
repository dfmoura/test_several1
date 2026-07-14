import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNfseXml } from '@nfse/xml';
import { renderDanfseV2 } from './danfse-v2-renderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_XML = join(__dirname, '../../../docs/example/oficial-31702062253369941000163000000000000626050264633732(1).xml');

const COL_WIDTHS = [137, 138, 138, 142] as const;
const META_LABELS = [
  'Tributação do ISSQN',
  'País Resultado da Prestação do Serviço',
  'Município de Incidência do ISSQN',
  'Regime Especial de Tributação',
] as const;

const TRIB_MUN_EXTRA_LABELS = [
  'Tipo de Imunidade',
  'Suspensão da Exigibilidade do ISSQN',
  'Número Processo Suspensão',
  'Benefício Municipal',
] as const;

function fitLabelFontSize(doc: PDFKit.PDFDocument, label: string, width: number, baseSize: number): number {
  let size = baseSize;
  doc.font('Courier-Bold');
  while (size > 5.5 && doc.fontSize(size).widthOfString(label) > width - 4) {
    size -= 0.25;
  }
  return size;
}

const SERVICO_ROW1_LABELS = [
  'Código de Tributação Nacional',
  'Código de Tributação Municipal',
  'Local da Prestação',
  'País de Prestação',
] as const;

describe('drawServicoBand — layout 4 colunas', () => {
  it('rótulos da primeira linha cabem em uma linha por coluna (fonte compacta)', () => {
    const doc = new PDFDocument();
    for (let i = 0; i < SERVICO_ROW1_LABELS.length; i++) {
      const width = COL_WIDTHS[i];
      const label = SERVICO_ROW1_LABELS[i];
      const fontSize = fitLabelFontSize(doc, label, width, 7);
      doc.font('Courier-Bold').fontSize(fontSize);
      const labelHeight = doc.heightOfString(label, { width: width - 4, lineGap: 0 });
      assert.ok(fontSize >= 5.5, `${label} ficou abaixo do mínimo`);
      assert.ok(labelHeight <= fontSize + 1.5, `${label} quebrou linha na coluna ${i}`);
    }
  });
});

const FEDERAL_ROW1_LABELS = [
  'IRRF',
  'Contribuição Previdenciária - Retida',
  'Contribuições Sociais - Retidas',
  'Descrição Contrib. Sociais - Retidas',
] as const;

const FEDERAL_ROW2_LABELS = [
  'PIS - Débito Apuração Própria',
  'COFINS - Débito Apuração Própria',
] as const;

describe('drawTributacaoMunicipalBand — layout 4 colunas', () => {
  it('rótulos da linha meta cabem em uma linha por coluna (fonte compacta)', () => {
    const doc = new PDFDocument();
    for (let i = 0; i < META_LABELS.length; i++) {
      const width = COL_WIDTHS[i];
      const label = META_LABELS[i];
      const fontSize = fitLabelFontSize(doc, label, width, 6);
      doc.font('Courier-Bold').fontSize(fontSize);
      const labelHeight = doc.heightOfString(label, { width: width - 4, lineGap: 0 });
      assert.ok(fontSize >= 5.5, `${label} ficou abaixo do mínimo`);
      assert.ok(labelHeight <= fontSize + 1.5, `${label} quebrou linha na coluna ${i}`);
    }
  });

  it('rótulos da segunda linha meta cabem em uma linha por coluna (fonte compacta)', () => {
    const doc = new PDFDocument();
    for (let i = 0; i < TRIB_MUN_EXTRA_LABELS.length; i++) {
      const width = COL_WIDTHS[i];
      const label = TRIB_MUN_EXTRA_LABELS[i];
      const fontSize = fitLabelFontSize(doc, label, width, 6);
      doc.font('Courier-Bold').fontSize(fontSize);
      const labelHeight = doc.heightOfString(label, { width: width - 4, lineGap: 0 });
      assert.ok(fontSize >= 5.5, `${label} ficou abaixo do mínimo`);
      assert.ok(labelHeight <= fontSize + 1.5, `${label} quebrou linha na coluna ${i}`);
    }
  });

  it('gera PDF do exemplo oficial sem erro', async () => {
    const xml = readFileSync(EXAMPLE_XML, 'utf-8');
    const parsed = parseNfseXml(xml);
    const pdf = await renderDanfseV2(parsed);
    assert.ok(pdf.length > 10_000);
  });
});

describe('drawTributacaoFederal — layout 4 colunas NT-008', () => {
  it('rótulos da linha 1 cabem em uma linha por coluna (fonte compacta)', () => {
    const doc = new PDFDocument();
    for (let i = 0; i < FEDERAL_ROW1_LABELS.length; i++) {
      const width = COL_WIDTHS[i];
      const label = FEDERAL_ROW1_LABELS[i];
      const fontSize = fitLabelFontSize(doc, label, width, 6);
      doc.font('Courier-Bold').fontSize(fontSize);
      const labelHeight = doc.heightOfString(label, { width: width - 4, lineGap: 0 });
      assert.ok(fontSize >= 5.5, `${label} ficou abaixo do mínimo`);
      assert.ok(labelHeight <= fontSize + 1.5, `${label} quebrou linha na coluna ${i}`);
    }
  });

  it('rótulos da linha 2 cabem em uma linha por coluna (fonte compacta)', () => {
    const doc = new PDFDocument();
    for (let i = 0; i < FEDERAL_ROW2_LABELS.length; i++) {
      const width = COL_WIDTHS[i];
      const label = FEDERAL_ROW2_LABELS[i];
      const fontSize = fitLabelFontSize(doc, label, width, 6);
      doc.font('Courier-Bold').fontSize(fontSize);
      const labelHeight = doc.heightOfString(label, { width: width - 4, lineGap: 0 });
      assert.ok(fontSize >= 5.5, `${label} ficou abaixo do mínimo`);
      assert.ok(labelHeight <= fontSize + 1.5, `${label} quebrou linha na coluna ${i}`);
    }
  });
});
