import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { MunicipioResolver, NfseDocument } from '@nfse/xml';
import { resolvePrefeituraCabecalho, type PrefeituraCabecalho } from './prefeitura-cabecalho.js';
import {
  buildQrUrl,
  codigoNbsComDescricao,
  codigoTribComDescricao,
  discriminacaoExibicao,
  fmtCep,
  fmtCurrency,
  fmtDate,
  fmtDateTime,
  fmtDoc,
  fmtEndereco,
  fmtLocalIncidencia,
  fmtLocalPrestacao,
  fmtMunicipio,
  fmtPais,
  fmtPaisResultado,
  fmtTelefone,
  fmtTributoAproximado,
  labelRegApTribSN,
  labelRegimeEspecial,
  labelRetencaoIssqn,
  labelRetencaoPisCofins,
  labelSimplesNacional,
  labelSuspensaoExigibilidade,
  labelTipoImunidade,
  labelTribIssqn,
  fmtBeneficioMunicipal,
  totalPisCofinsRetidos,
} from './danfse-formatters.js';

const MARGIN = 20;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = 555;
const BORDER = '#333333';
const COL1 = 137;
const COL2 = 138;
const COL3 = 138;
const COL4 = 142;
const FONT = 'Courier';
const FONT_BOLD = 'Courier-Bold';
const FS = 7;
/** Espaçamento interno do corpo — texto não colado nas linhas horizontais. */
const LAYOUT = {
  /** Respiro entre a linha superior da faixa e o conteúdo. */
  bandInset: 5,
  /** Respiro entre o conteúdo e a linha inferior da faixa. */
  bandOutset: 5,
  /** Distância vertical entre linhas de campos (label+valor). */
  rowStep: 20,
  /** Distância rótulo → valor dentro do mesmo campo. */
  valueOffset: 10,
  /** Respiro após linha divisória interna antes do próximo título/campo. */
  afterDivider: 4,
} as const;

const QR_SIZE = 38;
/** Fonte compacta para rótulos longos em colunas estreitas (TRIBUTAÇÃO MUNICIPAL). */
const FS_COMPACT = 6;
const FS_TITLE = 12;
const FS_VERSION = 14;
/** Área do cabeçalho onde antes ficava o texto "NFS-e / Nacional" */
const LOGO_SLOT_X = MARGIN + 8;
const LOGO_SLOT_W = 100;
const TITLE_BAND_H = 50;
const LOGO_ASPECT = 1920 / 389;
/** Slot superior direito — alinhado ao jrxml oficial (x=431, largura=122). */
const PREFETURA_SLOT_X = MARGIN + 411;
const PREFETURA_SLOT_W = 122;
/** NT-008: nome 8pt / contatos 6pt — Courier exige tamanho menor para caber sem quebra. */
const FS_PREFETITURA_NOME = 6;
const FS_PREFETITURA_CONTATO = 5.5;
const FS_PREFETITURA_MIN = 4.5;

/** Faixas verticais — TRIBUTAÇÃO MUNICIPAL + FEDERAL (offsets relativos ao início do conteúdo da faixa). */
const TRIB_MUN_LAYOUT = {
  metaRow1: { label: 10, value: 20, valueH: 8 },
  metaRow2: { label: 32, value: 42, valueH: 8 },
  moneyRow1: 54,
  moneyRow2: 74,
  federalLine: 94,
  federalHeader: 94 + LAYOUT.afterDivider,
  federalRow1: { label: 108, value: 118 },
  federalRow2: { label: 128, value: 138 },
  bandHeight: 152,
} as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '..', 'assets', 'logo-nfse-horizontal.png');

let logoBuffer: Buffer | null = null;

function loadLogo(): Buffer {
  if (!logoBuffer) {
    logoBuffer = readFileSync(LOGO_PATH);
  }
  return logoBuffer;
}

type PDF = PDFKit.PDFDocument;

function colX(index: 0 | 1 | 2 | 3): number {
  const offsets = [0, COL1, COL1 + COL2, COL1 + COL2 + COL3];
  return MARGIN + offsets[index];
}

function colW(index: 0 | 1 | 2 | 3): number {
  return [COL1, COL2, COL3, COL4][index];
}

function drawHLine(doc: PDF, y: number): void {
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(0.5).stroke(BORDER);
}

function drawVLines(doc: PDF, y: number, height: number): void {
  doc.moveTo(MARGIN, y).lineTo(MARGIN, y + height).lineWidth(0.5).stroke(BORDER);
  doc.moveTo(MARGIN + CONTENT_WIDTH, y).lineTo(MARGIN + CONTENT_WIDTH, y + height).lineWidth(0.5).stroke(BORDER);
}

function drawSectionHeader(doc: PDF, y: number, title: string, height = 10): number {
  doc.font(FONT_BOLD).fontSize(FS).fillColor('#000')
    .text(title, MARGIN + 2, y + 1, { width: CONTENT_WIDTH - 4 });
  return y + height;
}

function drawEmitenteSectionHeader(doc: PDF, y: number): void {
  doc.font(FONT_BOLD).fontSize(FS).fillColor('#000')
    .text('EMITENTE DA NFS-e', MARGIN + 2, y + 1, { width: colW(0) - 4 });
  doc.font(FONT).fontSize(FS).fillColor('#000')
    .text('Prestador do Serviço', MARGIN + 2, y + 9, { width: colW(0) - 4 });
}

function drawLabel(doc: PDF, x: number, y: number, w: number, label: string, fontSize = FS): void {
  doc.font(FONT_BOLD).fontSize(fontSize).fillColor('#000').text(label, x + 2, y, { width: w - 4, lineGap: 0 });
}

function drawValue(doc: PDF, x: number, y: number, w: number, value: string, offsetY = 8, fontSize = FS): void {
  doc.font(FONT).fontSize(fontSize).fillColor('#000').text(value || ' ', x + 2, y + offsetY, { width: w - 4, lineGap: 0 });
}

function truncateToWidth(doc: PDF, text: string, maxWidth: number, fontSize: number): string {
  doc.font(FONT).fontSize(fontSize);
  if (doc.widthOfString(text) <= maxWidth) return text;
  const ellipsis = '…';
  let truncated = text;
  while (truncated.length > 1 && doc.widthOfString(`${truncated}${ellipsis}`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}${ellipsis}`;
}

/** Valor em linha única — reduz fonte e trunca se necessário (ex.: endereço). */
function drawSingleLineValue(doc: PDF, x: number, y: number, w: number, value: string, offsetY = 8): void {
  const text = (value || ' ').trim() || ' ';
  let fontSize = FS;
  doc.font(FONT).fontSize(fontSize);
  const maxWidth = w - 4;
  while (fontSize > 5 && doc.widthOfString(text) > maxWidth) {
    fontSize -= 0.25;
  }
  const display = doc.widthOfString(text) > maxWidth ? truncateToWidth(doc, text, maxWidth, fontSize) : text;
  doc.font(FONT).fontSize(fontSize).fillColor('#000').text(display, x + 2, y + offsetY, {
    width: maxWidth,
    lineGap: 0,
    lineBreak: false,
  });
}

function drawSingleLineField(
  doc: PDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  valueOffset = LAYOUT.valueOffset,
): void {
  drawLabel(doc, x, y, w, label);
  drawSingleLineValue(doc, x, y, w, value, valueOffset);
}

function fitLabelFontSize(doc: PDF, label: string, width: number, baseSize: number, minSize = 5.5): number {
  let size = baseSize;
  doc.font(FONT_BOLD);
  while (size > minSize && doc.fontSize(size).widthOfString(label) > width - 4) {
    size -= 0.25;
  }
  return size;
}

function drawField(
  doc: PDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  valueOffset = LAYOUT.valueOffset,
): void {
  drawLabel(doc, x, y, w, label);
  drawValue(doc, x, y, w, value, valueOffset);
}

/** Campo meta com posições fixas (rótulo + valor em faixa de altura definida) — layout DANFSe oficial. */
function drawFixedMetaField(
  doc: PDF,
  bandY: number,
  labelOffset: number,
  valueOffset: number,
  x: number,
  w: number,
  label: string,
  value: string,
  opts?: { valueMaxHeight?: number; labelFontSize?: number; valueFontSize?: number },
): void {
  const labelFontSize = opts?.labelFontSize ?? FS;
  const valueFontSize = opts?.valueFontSize ?? FS;
  const valueMaxHeight = opts?.valueMaxHeight ?? 16;
  const labelSize = fitLabelFontSize(doc, label, w, labelFontSize);
  drawLabel(doc, x, bandY + labelOffset, w, label, labelSize);
  doc.font(FONT).fontSize(valueFontSize).fillColor('#000').text(value || ' ', x + 2, bandY + valueOffset, {
    width: w - 4,
    lineGap: 0,
    height: valueMaxHeight,
  });
}

/** Campo alinhado ao layout SERVIÇO PRESTADO. */
function drawServicoMetaField(
  doc: PDF,
  bandY: number,
  x: number,
  w: number,
  label: string,
  value: string,
): void {
  drawFixedMetaField(doc, bandY, 10, 20, x, w, label, value);
}

/** Altura do valor com quebra de linha (Courier 7pt), respeitando padding interno do campo. */
function measureFieldValueHeight(doc: PDF, value: string, width: number): number {
  const text = value.trim() || ' ';
  doc.font(FONT).fontSize(FS);
  return Math.max(8, doc.heightOfString(text, { width: width - 4, lineGap: 0 }));
}

function drawFixedCurrencyField(
  doc: PDF,
  bandY: number,
  labelOffset: number,
  valueOffset: number,
  x: number,
  w: number,
  label: string,
  value?: number,
  opts?: { labelFontSize?: number; valueFontSize?: number; valueMaxHeight?: number },
): void {
  const labelFontSize = opts?.labelFontSize ?? FS;
  const valueFontSize = opts?.valueFontSize ?? FS;
  const valueMaxHeight = opts?.valueMaxHeight ?? 8;
  const labelSize = fitLabelFontSize(doc, label, w, labelFontSize);
  drawLabel(doc, x, bandY + labelOffset, w, label, labelSize);
  const valueY = bandY + valueOffset;
  doc.font(FONT).fontSize(valueFontSize).fillColor('#000');
  if (value !== undefined && value !== null && !Number.isNaN(value)) {
    doc.text('R$', x + 2, valueY, { continued: false, lineGap: 0 });
    doc.text(fmtCurrency(value), x + 14, valueY, { width: w - 16, lineGap: 0, height: valueMaxHeight });
  } else {
    doc.text(' ', x + 2, valueY, { width: w - 4, lineGap: 0, height: valueMaxHeight });
  }
}

function drawCurrencyField(
  doc: PDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value?: number,
  opts?: { labelFontSize?: number },
): void {
  const labelFontSize = opts?.labelFontSize ?? FS;
  const labelSize = fitLabelFontSize(doc, label, w, labelFontSize);
  drawLabel(doc, x, y, w, label, labelSize);
  if (value !== undefined && value !== null && !Number.isNaN(value)) {
    doc.font(FONT).fontSize(FS).text('R$', x + 2, y + LAYOUT.valueOffset, { continued: false });
    doc.text(fmtCurrency(value), x + 14, y + LAYOUT.valueOffset, { width: w - 16 });
  }
}

function fieldBlockHeight(): number {
  return 7 + LAYOUT.valueOffset + 8;
}

function drawBand(doc: PDF, y: number, innerHeight: number, draw: (contentY: number) => void): number {
  const height = LAYOUT.bandInset + innerHeight + LAYOUT.bandOutset;
  drawVLines(doc, y, height);
  draw(y + LAYOUT.bandInset);
  drawHLine(doc, y + height);
  return y + height;
}

function drawWatermark(doc: PDF, text: string): void {
  doc.save();
  doc.rotate(-35, { origin: [PAGE_WIDTH / 2, 420] });
  doc.font(FONT_BOLD).fontSize(48).fillColor('#DDDDDD')
    .text(text, 100, 380, { align: 'center', width: 400 });
  doc.restore();
}

function fitContentFontSize(doc: PDF, text: string, width: number, baseSize: number, minSize = FS_PREFETITURA_MIN): number {
  let size = baseSize;
  doc.font(FONT);
  while (size > minSize && doc.fontSize(size).widthOfString(text) > width - 2) {
    size -= 0.25;
  }
  return size;
}

function drawPrefeituraCabecalho(doc: PDF, y: number, prefeitura: PrefeituraCabecalho): void {
  const slotPad = 2;
  const slotW = PREFETURA_SLOT_W - slotPad;

  const entries: { text: string; baseSize: number }[] = [
    { text: prefeitura.nome, baseSize: FS_PREFETITURA_NOME },
  ];
  if (prefeitura.telefone) entries.push({ text: prefeitura.telefone, baseSize: FS_PREFETITURA_CONTATO });
  if (prefeitura.email) entries.push({ text: prefeitura.email, baseSize: FS_PREFETITURA_CONTATO });

  const lines = entries.map((entry) => ({
    text: entry.text,
    size: fitContentFontSize(doc, entry.text, slotW, entry.baseSize),
  }));

  const lineAdvance = (size: number) => size + 0.75;
  const blockH = lines.reduce((sum, line) => sum + lineAdvance(line.size), 0);
  let lineY = y + Math.max(3, (TITLE_BAND_H - blockH) / 2);

  doc.fillColor('#000');
  for (const line of lines) {
    doc.font(FONT).fontSize(line.size);
    doc.text(line.text, PREFETURA_SLOT_X, lineY, {
      width: PREFETURA_SLOT_W,
      align: 'right',
      lineGap: 0,
    });
    lineY += lineAdvance(line.size);
  }
}

function drawTitleBand(doc: PDF, y: number, versao?: string, prefeitura?: PrefeituraCabecalho): number {
  const height = TITLE_BAND_H;
  doc.rect(MARGIN, y, CONTENT_WIDTH, height).lineWidth(0.5).stroke(BORDER);

  let drawW = LOGO_SLOT_W;
  let drawH = drawW / LOGO_ASPECT;
  if (drawH > height) {
    drawH = height;
    drawW = drawH * LOGO_ASPECT;
  }
  const drawX = LOGO_SLOT_X + (LOGO_SLOT_W - drawW) / 2;
  const drawY = y + (height - drawH) / 2;
  doc.image(loadLogo(), drawX, drawY, { width: drawW, height: drawH });

  const ver = versao ?? '1.01';
  doc.font(FONT_BOLD).fontSize(FS_VERSION).fillColor('#000')
    .text(`DANFSe v${ver}`, MARGIN + 170, y + 8, { width: 220, align: 'center' });
  doc.font(FONT_BOLD).fontSize(FS_TITLE)
    .text('Documento Auxiliar da NFS-e', MARGIN + 140, y + 28, { width: 280, align: 'center' });

  if (prefeitura?.nome) {
    drawPrefeituraCabecalho(doc, y, prefeitura);
  }

  return y + height;
}

function drawIdentificacaoBand(doc: PDF, y: number, docData: NfseDocument, qrPng: Buffer): number {
  const row = LAYOUT.rowStep;
  const innerHeight = row * 2 + fieldBlockHeight();
  const qrX = MARGIN + 417;
  const bandHeight = LAYOUT.bandInset + innerHeight + LAYOUT.bandOutset;

  return drawBand(doc, y, innerHeight, (cy) => {
    drawField(doc, MARGIN, cy, 413, 'Chave de Acesso da NFS-e', docData.chaveAcesso);

    drawField(doc, colX(0), cy + row, colW(0), 'Número da NFS-e', docData.nNfse ?? '');
    drawField(doc, colX(1), cy + row, colW(1), 'Competência da NFS-e', fmtDate(docData.dCompet));
    drawField(doc, colX(2), cy + row, colW(2), 'Data e Hora da emissão da NFS-e', fmtDateTime(docData.dhProc));

    drawField(doc, colX(0), cy + row * 2, colW(0), 'Número da DPS', docData.dps?.numero ?? '');
    drawField(doc, colX(1), cy + row * 2, colW(1), 'Série da DPS', docData.dps?.serie ?? '');
    drawField(doc, colX(2), cy + row * 2, colW(2), 'Data e Hora da emissão da DPS', fmtDateTime(docData.dhEmi));

    const qrY = y + (bandHeight - QR_SIZE) / 2;
    doc.image(qrPng, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });
    doc.font(FONT).fontSize(5).fillColor('#4F4F4F')
      .text(
        'A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e',
        qrX + QR_SIZE + 3,
        qrY + 4,
        { width: 86, lineGap: 0 },
      );
  });
}

function drawEmitenteBand(doc: PDF, y: number, docData: NfseDocument): number {
  const row = LAYOUT.rowStep;
  const innerHeight = row * 3 + fieldBlockHeight();
  const p = docData.prestador;
  const end = p.endereco;
  const municipio = fmtMunicipio(docData.xLocEmi, end?.uf);

  return drawBand(doc, y, innerHeight, (cy) => {
    drawEmitenteSectionHeader(doc, cy);
    drawField(doc, colX(1), cy, colW(1), 'CNPJ / CPF / NIF', fmtDoc(p.cnpj, p.cpf));
    drawField(doc, colX(2), cy, colW(2), 'Inscrição Municipal', p.inscricaoMunicipal ?? '');
    drawField(doc, colX(3), cy, colW(3), 'Telefone', fmtTelefone(p.telefone));

    drawField(doc, MARGIN, cy + row, 276, 'Nome / Nome empresarial', p.razaoSocial ?? '');
    drawField(doc, colX(2), cy + row, COL2 + COL3 + COL4, 'E-mail', p.email ?? '');

    drawSingleLineField(doc, MARGIN, cy + row * 2, 276, 'Endereço', fmtEndereco(end));
    drawField(doc, colX(2), cy + row * 2, colW(2), 'Municipio', municipio);
    drawField(doc, colX(3), cy + row * 2, colW(3), 'CEP', fmtCep(end?.cep));

    drawField(doc, MARGIN, cy + row * 3, 276, 'Simples Nacional na Data de Competência', labelSimplesNacional(docData.regTrib?.opSimpNac));
    drawField(doc, colX(2), cy + row * 3, COL2 + COL3 + COL4, 'Regime de Apuração Tributária pelo SN', labelRegApTribSN(docData.regTrib?.regApTribSN));
  });
}

function drawTomadorBand(doc: PDF, y: number, docData: NfseDocument): number {
  const row = LAYOUT.rowStep;
  const innerHeight = row * 2 + fieldBlockHeight();
  const t = docData.tomador;
  const end = t.endereco;

  return drawBand(doc, y, innerHeight, (cy) => {
    drawSectionHeader(doc, cy, 'TOMADOR DO SERVIÇO', 16);
    drawField(doc, colX(1), cy, colW(1), 'CNPJ / CPF / NIF', fmtDoc(t.cnpj, t.cpf));
    drawField(doc, colX(2), cy, colW(2), 'Inscrição Municipal', t.inscricaoMunicipal ?? '');
    drawField(doc, colX(3), cy, colW(3), 'Telefone', fmtTelefone(t.telefone));

    drawField(doc, MARGIN, cy + row, 276, 'Nome / Nome empresarial', t.razaoSocial ?? '');
    drawField(doc, colX(2), cy + row, COL2 + COL3 + COL4, 'E-mail', t.email ?? '');

    drawSingleLineField(doc, MARGIN, cy + row * 2, 276, 'Endereço', fmtEndereco(end));
    drawField(doc, colX(2), cy + row * 2, colW(2), 'Municipio', fmtMunicipio(end?.nomeMunicipio, end?.uf));
    drawField(doc, colX(3), cy + row * 2, colW(3), 'CEP', fmtCep(end?.cep));
  });
}

function drawServicoBand(doc: PDF, y: number, docData: NfseDocument): number {
  const localPrest = fmtLocalPrestacao(docData);
  const paisPrest = fmtPais(docData.servico.codigoPaisPrestacao);
  const descricao = docData.servico.descricao ?? '';

  const row1Fields: Array<{ col: 0 | 1 | 2 | 3; label: string; value: string }> = [
    { col: 0, label: 'Código de Tributação Nacional', value: codigoTribComDescricao(docData) },
    { col: 1, label: 'Código de Tributação Municipal', value: docData.servico.codigoTributacaoMunicipal ?? '' },
    { col: 2, label: 'Local da Prestação', value: localPrest },
    { col: 3, label: 'País de Prestação', value: paisPrest },
  ];

  const descValueHeight = measureFieldValueHeight(doc, descricao, CONTENT_WIDTH);
  const descLabelY = 42;
  const descValueY = 52;
  const innerHeight = Math.max(62, descValueY + descValueHeight + 2);

  return drawBand(doc, y, innerHeight, (cy) => {
    drawSectionHeader(doc, cy, 'SERVIÇO PRESTADO', 10);

    for (const field of row1Fields) {
      drawServicoMetaField(doc, cy, colX(field.col), colW(field.col), field.label, field.value);
    }

    drawLabel(doc, MARGIN, cy + descLabelY, CONTENT_WIDTH, 'Descrição do Serviço');
    drawValue(doc, MARGIN, cy + descValueY, CONTENT_WIDTH, descricao, 0);
  });
}

function drawTributacaoMunicipalBand(doc: PDF, y: number, docData: NfseDocument): number {
  const L = TRIB_MUN_LAYOUT;
  const innerHeight = L.bandHeight;
  const trib = docData.tributacao;
  const v = docData.valores;
  const issRetido = trib?.tpRetISSQN && trib.tpRetISSQN !== '1';
  const compactMeta = { labelFontSize: FS_COMPACT, valueFontSize: FS_COMPACT, valueMaxHeight: 8 };

  const metaFields: Array<{ col: 0 | 1 | 2 | 3; label: string; value: string }> = [
    { col: 0, label: 'Tributação do ISSQN', value: labelTribIssqn(trib?.tribISSQN) },
    { col: 1, label: 'País Resultado da Prestação do Serviço', value: fmtPaisResultado(docData) },
    { col: 2, label: 'Município de Incidência do ISSQN', value: fmtLocalIncidencia(docData) },
    { col: 3, label: 'Regime Especial de Tributação', value: labelRegimeEspecial(docData.regTrib?.regEspTrib) },
  ];

  const metaRow2Fields: Array<{ col: 0 | 1 | 2 | 3; label: string; value: string }> = [
    { col: 0, label: 'Tipo de Imunidade', value: labelTipoImunidade(trib?.tpImunidade) },
    {
      col: 1,
      label: 'Suspensão da Exigibilidade do ISSQN',
      value: labelSuspensaoExigibilidade(trib?.suspensaoExigibilidade),
    },
    { col: 2, label: 'Número Processo Suspensão', value: trib?.numeroProcessoSuspensao ?? '' },
    { col: 3, label: 'Benefício Municipal', value: fmtBeneficioMunicipal(trib?.nBM) },
  ];

  return drawBand(doc, y, innerHeight, (cy) => {
    drawSectionHeader(doc, cy, 'TRIBUTAÇÃO MUNICIPAL', 10);

    for (const field of metaFields) {
      drawFixedMetaField(
        doc, cy, L.metaRow1.label, L.metaRow1.value,
        colX(field.col), colW(field.col), field.label, field.value,
        { ...compactMeta, valueMaxHeight: L.metaRow1.valueH },
      );
    }

    for (const field of metaRow2Fields) {
      drawFixedMetaField(
        doc, cy, L.metaRow2.label, L.metaRow2.value,
        colX(field.col), colW(field.col), field.label, field.value,
        { ...compactMeta, valueMaxHeight: L.metaRow2.valueH },
      );
    }

    drawCurrencyField(doc, colX(0), cy + L.moneyRow1, colW(0), 'Valor do Serviço', v.valorServico);
    drawCurrencyField(doc, colX(1), cy + L.moneyRow1, colW(1), 'Desconto incondicionado', v.descontoIncondicionado);
    drawCurrencyField(doc, colX(2), cy + L.moneyRow1, colW(2), 'Total Deduções/Reduções', v.totalDeducoes ?? 0);
    drawCurrencyField(doc, colX(3), cy + L.moneyRow1, colW(3), 'Cálculo do BM', v.calculoBM ?? 0);

    drawCurrencyField(doc, colX(0), cy + L.moneyRow2, colW(0), 'BC ISSQN', v.baseCalculo);
    drawField(doc, colX(1), cy + L.moneyRow2, colW(1), 'Alíquota Aplicada %', v.aliquotaIss !== undefined ? fmtCurrency(v.aliquotaIss) : '');
    drawField(doc, colX(2), cy + L.moneyRow2, colW(2), 'Retenção do ISSQN', labelRetencaoIssqn(trib?.tpRetISSQN));
    if (!issRetido) {
      drawCurrencyField(doc, colX(3), cy + L.moneyRow2, colW(3), 'ISSQN Apurado', v.valorIss);
    } else {
      drawField(doc, colX(3), cy + L.moneyRow2, colW(3), 'ISSQN Apurado', '');
    }

    drawHLine(doc, cy + L.federalLine);
    drawSectionHeader(doc, cy + L.federalHeader, 'TRIBUTAÇÃO FEDERAL', 10);

    const federalCompact = { labelFontSize: FS_COMPACT, valueFontSize: FS_COMPACT, valueMaxHeight: 8 };
    const R1 = L.federalRow1;
    const R2 = L.federalRow2;

    const federalRow1: Array<
      | { kind: 'currency'; col: 0 | 1 | 2 | 3; label: string; value?: number }
      | { kind: 'text'; col: 0 | 1 | 2 | 3; label: string; value: string; valueMaxHeight?: number }
    > = [
      { kind: 'currency', col: 0, label: 'IRRF', value: v.valorIr },
      { kind: 'currency', col: 1, label: 'Contribuição Previdenciária - Retida', value: v.valorInss },
      { kind: 'currency', col: 2, label: 'Contribuições Sociais - Retidas', value: v.valorCsll },
      {
        kind: 'text',
        col: 3,
        label: 'Descrição Contrib. Sociais - Retidas',
        value: labelRetencaoPisCofins(trib?.tpRetPisCofins),
        valueMaxHeight: 8,
      },
    ];

    const federalRow2: Array<{ col: 0 | 1 | 2 | 3; label: string; value?: number }> = [
      { col: 0, label: 'PIS - Débito Apuração Própria', value: v.valorPis },
      { col: 1, label: 'COFINS - Débito Apuração Própria', value: v.valorCofins },
    ];

    for (const field of federalRow1) {
      const x = colX(field.col);
      const w = colW(field.col);
      if (field.kind === 'currency') {
        drawFixedCurrencyField(doc, cy, R1.label, R1.value, x, w, field.label, field.value, federalCompact);
      } else {
        drawFixedMetaField(
          doc, cy, R1.label, R1.value, x, w, field.label, field.value,
          { ...federalCompact, valueMaxHeight: field.valueMaxHeight ?? 8 },
        );
      }
    }

    for (const field of federalRow2) {
      drawFixedCurrencyField(
        doc, cy, R2.label, R2.value,
        colX(field.col), colW(field.col), field.label, field.value, federalCompact,
      );
    }
  });
}

function drawValorTotalBand(doc: PDF, y: number, docData: NfseDocument): number {
  const row1 = 12;
  const row2 = 32;
  const dividerY = 54;
  const subHeaderY = dividerY + LAYOUT.afterDivider;
  const tributosRow = subHeaderY + 12;
  const innerHeight = tributosRow + fieldBlockHeight() + 2;
  const v = docData.valores;
  const trib = docData.tributacao;
  const issRetido = trib?.tpRetISSQN && trib.tpRetISSQN !== '1';

  return drawBand(doc, y, innerHeight, (cy) => {
    drawSectionHeader(doc, cy, 'VALOR TOTAL DA NFS-E', 10);

    drawCurrencyField(doc, colX(0), cy + row1, colW(0), 'Valor do Serviço', v.valorServico);
    drawCurrencyField(doc, colX(1), cy + row1, colW(1), 'Desconto Condicionado', v.descontoCondicionado);
    drawCurrencyField(doc, colX(2), cy + row1, colW(2), 'Desconto Incondicionado', v.descontoIncondicionado ?? 0);
    if (issRetido) {
      drawCurrencyField(doc, colX(3), cy + row1, colW(3), 'ISSQN Retido', v.valorIss);
    } else {
      drawField(doc, colX(3), cy + row1, colW(3), 'ISSQN Retido', '');
    }

    drawCurrencyField(doc, colX(0), cy + row2, colW(0), 'IRRF, CP, CSLL - Retidos', v.valorTotalRetido ?? 0);
    drawCurrencyField(doc, colX(1), cy + row2, COL2 + COL3, 'PIS/COFINS Retidos', totalPisCofinsRetidos(docData));
    drawCurrencyField(doc, colX(3), cy + row2, colW(3), 'Valor Líquido da NFS-e', v.valorLiquido ?? v.valorServico);

    drawHLine(doc, cy + dividerY);
    drawSectionHeader(doc, cy + subHeaderY, 'TOTAIS APROXIMADOS DOS TRIBUTOS', 10);

    const t = docData.tributacao;
    const snPct = t?.pTotTribSN;
    drawField(doc, MARGIN, cy + tributosRow, 184, 'Federais', snPct ? `${fmtCurrency(snPct)}% (SN)` : fmtTributoAproximado(t?.vTotTribFed, t?.pTotTribFed));
    drawField(doc, MARGIN + 184, cy + tributosRow, 185, 'Estaduais', fmtTributoAproximado(t?.vTotTribEst, t?.pTotTribEst));
    drawField(doc, MARGIN + 369, cy + tributosRow, 186, 'Municipais', fmtTributoAproximado(t?.vTotTribMun, t?.pTotTribMun));
  });
}

function drawInfoComplementaresBand(doc: PDF, y: number, docData: NfseDocument): number {
  const discriminacao = discriminacaoExibicao(docData);
  const nbsDisplay = codigoNbsComDescricao(docData);
  const hasSubs = Boolean(docData.chaveSubstituta);
  const contentTop = 12;
  const innerHeight = hasSubs
    ? contentTop + fieldBlockHeight() * 2 + 8
    : discriminacao || nbsDisplay
      ? contentTop + fieldBlockHeight() + 4
      : 14;

  return drawBand(doc, y, innerHeight, (cy) => {
    drawSectionHeader(doc, cy, 'INFORMAÇÕES COMPLEMENTARES', 10);
    if (discriminacao) {
      doc.font(FONT).fontSize(FS).text(discriminacao, MARGIN + 2, cy + contentTop, { width: CONTENT_WIDTH - 4 });
    }
    if (nbsDisplay) {
      drawField(
        doc,
        MARGIN,
        cy + (discriminacao ? 26 : contentTop),
        CONTENT_WIDTH,
        'NBS',
        nbsDisplay,
      );
    }
    if (hasSubs) {
      drawField(doc, MARGIN, cy + innerHeight - fieldBlockHeight() - 2, CONTENT_WIDTH, 'NFSe Substituta', docData.chaveSubstituta ?? '');
    }
  });
}

export interface RenderDanfseOptions {
  cadastro?: MunicipioResolver;
}

export async function renderDanfseV2(
  docData: NfseDocument,
  situacao?: string,
  options?: RenderDanfseOptions,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const finished = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const qrPng = await QRCode.toBuffer(buildQrUrl(docData.chaveAcesso, docData.tpAmb), {
    width: 230,
    margin: 0,
    type: 'png',
  });

  if (situacao === 'CANCELADA') drawWatermark(doc, 'CANCELADO');
  if (situacao === 'SUBSTITUIDA') drawWatermark(doc, 'SUBSTITUÍDA');

  const prefeitura = await resolvePrefeituraCabecalho(docData, options?.cadastro);

  let y = MARGIN;
  y = drawTitleBand(doc, y, docData.versao, prefeitura);
  y = drawIdentificacaoBand(doc, y, docData, qrPng);
  y = drawEmitenteBand(doc, y, docData);
  y = drawTomadorBand(doc, y, docData);
  y = drawServicoBand(doc, y, docData);
  y = drawTributacaoMunicipalBand(doc, y, docData);
  y = drawValorTotalBand(doc, y, docData);
  y = drawInfoComplementaresBand(doc, y, docData);

  doc.font(FONT).fontSize(5).fillColor('#666')
    .text(
      'Documento gerado localmente conforme Nota Técnica 008/2026 — DANFSe v2.0. Consulte a autenticidade pelo QR Code ou no portal nacional da NFS-e.',
      MARGIN,
      y + 6,
      { width: CONTENT_WIDTH, align: 'center' },
    );

  doc.end();
  return finished;
}

export async function renderDanfseFromXml(xml: string, chave?: string, situacao?: string): Promise<Buffer> {
  const { parseNfseXml } = await import('@nfse/xml');
  const parsed = parseNfseXml(xml, chave);
  return renderDanfseV2(parsed, situacao);
}
