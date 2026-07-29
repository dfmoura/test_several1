/**
 * DANFSe v2 — layout alinhado ao padrão nacional (NOTA_NACIONAL_V2.jrxml /
 * @nfse/danfse). Courier + grades + QR de consulta pública.
 *
 * @see https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica
 */

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { FISCAL_DEFAULTS } from "@/lib/fiscal-emissao";
import { formatCep, formatDocumento } from "@/lib/parceiros";

const MARGIN = 20;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = 555;
const BORDER = "#333333";
const COL1 = 137;
const COL2 = 138;
const COL3 = 138;
const COL4 = 142;
const FONT = "Courier";
const FONT_BOLD = "Courier-Bold";
const FS = 7;
const FS_TITLE = 12;
const FS_VERSION = 14;
const QR_SIZE = 38;
const TITLE_BAND_H = 50;
const LOGO_SLOT_X = MARGIN + 8;
const LOGO_SLOT_W = 100;
const LOGO_ASPECT = 1920 / 389;
const PREFETURA_SLOT_X = MARGIN + 411;
const PREFETURA_SLOT_W = 122;

const LAYOUT = {
  bandInset: 5,
  bandOutset: 5,
  rowStep: 20,
  valueOffset: 10,
  afterDivider: 4,
} as const;

type PDF = PDFKit.PDFDocument;

export type DanfseV2Input = {
  empresa: {
    razaoSocial: string;
    cnpj: string;
    inscricaoMunicipal?: string | null;
    email?: string | null;
    telefone?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
    cep?: string | null;
  };
  tomadorNome: string;
  tomadorDoc?: string | null;
  tomadorEndereco?: string | null;
  tomadorCidadeUf?: string | null;
  tomadorCep?: string | null;
  tomadorEmail?: string | null;
  tomadorTelefone?: string | null;
  numero: string;
  serie: string;
  chave: string | null;
  valor: number;
  discriminacao: string;
  cTribNac?: string | null;
  cNbs?: string | null;
  simulado: boolean;
  autorizadoEm: Date | null;
  dpsNumero?: string | null;
  pTotTribSN?: number;
  versao?: string;
};

function colX(index: 0 | 1 | 2 | 3): number {
  const offsets = [0, COL1, COL1 + COL2, COL1 + COL2 + COL3];
  return MARGIN + offsets[index];
}

function colW(index: 0 | 1 | 2 | 3): number {
  return [COL1, COL2, COL3, COL4][index];
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR");
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleString("pt-BR");
}

function fmtFone(fone?: string | null): string {
  const d = (fone || "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return fone || "";
}

function buildQrUrl(chave: string, homolog: boolean): string {
  const host = homolog
    ? "https://www.producaorestrita.nfse.gov.br"
    : "https://www.nfse.gov.br";
  return `${host}/ConsultaPublica/?tpc=1&chave=${chave}`;
}

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public/brand/logo-nfse-horizontal.png"),
    path.join(process.cwd(), "apps/web/public/brand/logo-nfse-horizontal.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function drawHLine(doc: PDF, y: number): void {
  doc
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + CONTENT_WIDTH, y)
    .lineWidth(0.5)
    .stroke(BORDER);
}

function drawVLines(doc: PDF, y: number, height: number): void {
  doc.moveTo(MARGIN, y).lineTo(MARGIN, y + height).lineWidth(0.5).stroke(BORDER);
  doc
    .moveTo(MARGIN + CONTENT_WIDTH, y)
    .lineTo(MARGIN + CONTENT_WIDTH, y + height)
    .lineWidth(0.5)
    .stroke(BORDER);
}

function drawLabel(doc: PDF, x: number, y: number, w: number, label: string, fontSize = FS): void {
  doc
    .font(FONT_BOLD)
    .fontSize(fontSize)
    .fillColor("#000")
    .text(label, x + 2, y, { width: w - 4, lineGap: 0 });
}

function drawValue(
  doc: PDF,
  x: number,
  y: number,
  w: number,
  value: string,
  offsetY = 8,
  fontSize = FS,
): void {
  doc
    .font(FONT)
    .fontSize(fontSize)
    .fillColor("#000")
    .text(value || " ", x + 2, y + offsetY, { width: w - 4, lineGap: 0 });
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

function drawCurrencyField(
  doc: PDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value?: number | null,
): void {
  drawLabel(doc, x, y, w, label);
  if (value !== undefined && value !== null && !Number.isNaN(value)) {
    doc.font(FONT).fontSize(FS).text("R$", x + 2, y + LAYOUT.valueOffset, { continued: false });
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

function drawSectionHeader(doc: PDF, y: number, title: string, height = 10): number {
  doc
    .font(FONT_BOLD)
    .fontSize(FS)
    .fillColor("#000")
    .text(title, MARGIN + 2, y + 1, { width: CONTENT_WIDTH - 4 });
  return y + height;
}

function drawWatermark(doc: PDF, text: string): void {
  doc.save();
  doc.rotate(-35, { origin: [PAGE_WIDTH / 2, 420] });
  doc
    .font(FONT_BOLD)
    .fontSize(48)
    .fillColor("#DDDDDD")
    .text(text, 100, 380, { align: "center", width: 400 });
  doc.restore();
}

function drawTitleBand(doc: PDF, y: number, versao: string, cidade: string): number {
  const height = TITLE_BAND_H;
  doc.rect(MARGIN, y, CONTENT_WIDTH, height).lineWidth(0.5).stroke(BORDER);

  const logo = resolveLogoPath();
  if (logo) {
    let drawW = LOGO_SLOT_W;
    let drawH = drawW / LOGO_ASPECT;
    if (drawH > height) {
      drawH = height;
      drawW = drawH * LOGO_ASPECT;
    }
    const drawX = LOGO_SLOT_X + (LOGO_SLOT_W - drawW) / 2;
    const drawY = y + (height - drawH) / 2;
    try {
      doc.image(logo, drawX, drawY, { width: drawW, height: drawH });
    } catch {
      /* ignore */
    }
  }

  doc
    .font(FONT_BOLD)
    .fontSize(FS_VERSION)
    .fillColor("#000")
    .text(`DANFSe v${versao}`, MARGIN + 170, y + 8, { width: 220, align: "center" });
  doc
    .font(FONT_BOLD)
    .fontSize(FS_TITLE)
    .text("Documento Auxiliar da NFS-e", MARGIN + 140, y + 28, {
      width: 280,
      align: "center",
    });

  doc
    .font(FONT)
    .fontSize(6)
    .fillColor("#000")
    .text(`Prefeitura Municipal de\n${cidade || "Uberlândia"}`, PREFETURA_SLOT_X, y + 14, {
      width: PREFETURA_SLOT_W,
      align: "right",
      lineGap: 1,
    });

  return y + height;
}

function enderecoEmpresa(e: DanfseV2Input["empresa"]): string {
  return [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.bairro,
  ]
    .filter(Boolean)
    .join(" - ");
}

export async function renderDanfseV2(input: DanfseV2Input): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    info: { Title: `DANFSe ${input.numero}`, Author: input.empresa.razaoSocial },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const chave = input.chave || "";
  const qrPng = await QRCode.toBuffer(buildQrUrl(chave || "0", input.simulado), {
    width: 230,
    margin: 0,
    type: "png",
  });

  if (input.simulado) drawWatermark(doc, "HOMOLOGAÇÃO");

  const versao = input.versao || "1.01";
  const cTrib = input.cTribNac || FISCAL_DEFAULTS.cTribNac;
  const cNbs = input.cNbs || FISCAL_DEFAULTS.cNbs;
  const pTot = input.pTotTribSN ?? FISCAL_DEFAULTS.pTotTribSN;
  const dps = input.dpsNumero || input.numero;
  const cidade = input.empresa.cidade || "Uberlândia";
  const uf = input.empresa.uf || "MG";
  const row = LAYOUT.rowStep;

  let y = MARGIN;
  y = drawTitleBand(doc, y, versao, cidade);

  // Identificação + QR
  {
    const bandStart = y;
    const innerHeight = row * 2 + fieldBlockHeight();
    const bandHeight = LAYOUT.bandInset + innerHeight + LAYOUT.bandOutset;
    const qrX = MARGIN + 417;
    y = drawBand(doc, y, innerHeight, (cy) => {
      drawField(doc, MARGIN, cy, 413, "Chave de Acesso da NFS-e", chave);
      drawField(doc, colX(0), cy + row, colW(0), "Número da NFS-e", input.numero);
      drawField(doc, colX(1), cy + row, colW(1), "Competência da NFS-e", fmtDate(input.autorizadoEm));
      drawField(
        doc,
        colX(2),
        cy + row,
        colW(2),
        "Data e Hora da emissão da NFS-e",
        fmtDateTime(input.autorizadoEm),
      );
      drawField(doc, colX(0), cy + row * 2, colW(0), "Número da DPS", dps);
      drawField(doc, colX(1), cy + row * 2, colW(1), "Série da DPS", input.serie);
      drawField(
        doc,
        colX(2),
        cy + row * 2,
        colW(2),
        "Data e Hora da emissão da DPS",
        fmtDateTime(input.autorizadoEm),
      );
      const qrY = bandStart + (bandHeight - QR_SIZE) / 2;
      doc.image(qrPng, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });
      doc
        .font(FONT)
        .fontSize(5)
        .fillColor("#4F4F4F")
        .text(
          "A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e",
          qrX + QR_SIZE + 3,
          qrY + 4,
          { width: 86, lineGap: 0 },
        );
    });
  }

  // Emitente
  {
    const innerHeight = row * 3 + fieldBlockHeight();
    y = drawBand(doc, y, innerHeight, (cy) => {
      doc
        .font(FONT_BOLD)
        .fontSize(FS)
        .fillColor("#000")
        .text("EMITENTE DA NFS-e", MARGIN + 2, cy + 1, { width: colW(0) - 4 });
      doc
        .font(FONT)
        .fontSize(FS)
        .text("Prestador do Serviço", MARGIN + 2, cy + 9, { width: colW(0) - 4 });
      drawField(
        doc,
        colX(1),
        cy,
        colW(1),
        "CNPJ / CPF / NIF",
        formatDocumento(input.empresa.cnpj),
      );
      drawField(
        doc,
        colX(2),
        cy,
        colW(2),
        "Inscrição Municipal",
        input.empresa.inscricaoMunicipal || "",
      );
      drawField(doc, colX(3), cy, colW(3), "Telefone", fmtFone(input.empresa.telefone));

      drawField(doc, MARGIN, cy + row, 276, "Nome / Nome empresarial", input.empresa.razaoSocial);
      drawField(doc, colX(2), cy + row, COL2 + COL3 + COL4, "E-mail", input.empresa.email || "");

      drawField(doc, MARGIN, cy + row * 2, 276, "Endereço", enderecoEmpresa(input.empresa));
      drawField(doc, colX(2), cy + row * 2, colW(2), "Municipio", `${cidade} - ${uf}`);
      drawField(
        doc,
        colX(3),
        cy + row * 2,
        colW(3),
        "CEP",
        input.empresa.cep ? formatCep(input.empresa.cep) : "",
      );

      drawField(
        doc,
        MARGIN,
        cy + row * 3,
        276,
        "Simples Nacional na Data de Competência",
        "Optante - Microempresa ou Empresa de Pequeno Porte (ME/EPP)",
      );
      drawField(
        doc,
        colX(2),
        cy + row * 3,
        COL2 + COL3 + COL4,
        "Regime de Apuração Tributária pelo SN",
        "Regime de apuração dos tributos federais e municipal pelo SN",
      );
    });
  }

  // Tomador
  {
    const innerHeight = row * 2 + fieldBlockHeight();
    y = drawBand(doc, y, innerHeight, (cy) => {
      drawSectionHeader(doc, cy, "TOMADOR DO SERVIÇO", 16);
      drawField(
        doc,
        colX(1),
        cy,
        colW(1),
        "CNPJ / CPF / NIF",
        input.tomadorDoc ? formatDocumento(input.tomadorDoc) : "",
      );
      drawField(doc, colX(2), cy, colW(2), "Inscrição Municipal", "");
      drawField(doc, colX(3), cy, colW(3), "Telefone", fmtFone(input.tomadorTelefone));

      drawField(doc, MARGIN, cy + row, 276, "Nome / Nome empresarial", input.tomadorNome);
      drawField(doc, colX(2), cy + row, COL2 + COL3 + COL4, "E-mail", input.tomadorEmail || "");

      drawField(doc, MARGIN, cy + row * 2, 276, "Endereço", input.tomadorEndereco || "");
      drawField(doc, colX(2), cy + row * 2, colW(2), "Municipio", input.tomadorCidadeUf || "");
      drawField(
        doc,
        colX(3),
        cy + row * 2,
        colW(3),
        "CEP",
        input.tomadorCep ? formatCep(input.tomadorCep) : "",
      );
    });
  }

  // Serviço
  {
    const descH = Math.max(
      8,
      doc.heightOfString(input.discriminacao || " ", {
        width: CONTENT_WIDTH - 4,
      }),
    );
    const descLabelY = 42;
    const descValueY = 52;
    const innerHeight = Math.max(62, descValueY + descH + 2);
    y = drawBand(doc, y, innerHeight, (cy) => {
      drawSectionHeader(doc, cy, "SERVIÇO PRESTADO", 10);
      drawField(
        doc,
        colX(0),
        cy + 10,
        colW(0),
        "Código de Tributação Nacional",
        `${cTrib} — Composição gráfica`,
      );
      drawField(doc, colX(1), cy + 10, colW(1), "Código de Tributação Municipal", "");
      drawField(doc, colX(2), cy + 10, colW(2), "Local da Prestação", `${cidade} - ${uf}`);
      drawField(doc, colX(3), cy + 10, colW(3), "País de Prestação", "Brasil");
      drawLabel(doc, MARGIN, cy + descLabelY, CONTENT_WIDTH, "Descrição do Serviço");
      drawValue(doc, MARGIN, cy + descValueY, CONTENT_WIDTH, input.discriminacao, 0);
    });
  }

  // Tributação municipal + federal
  {
    const innerHeight = 152;
    y = drawBand(doc, y, innerHeight, (cy) => {
      drawSectionHeader(doc, cy, "TRIBUTAÇÃO MUNICIPAL", 10);
      drawField(doc, colX(0), cy + 10, colW(0), "Tributação do ISSQN", "Operação tributável");
      drawField(doc, colX(1), cy + 10, colW(1), "País Resultado da Prestação do Serviço", "Brasil");
      drawField(doc, colX(2), cy + 10, colW(2), "Município de Incidência do ISSQN", `${cidade} - ${uf}`);
      drawField(doc, colX(3), cy + 10, colW(3), "Regime Especial de Tributação", "Sem Regime Especial");

      drawCurrencyField(doc, colX(0), cy + 54, colW(0), "Valor do Serviço", input.valor);
      drawCurrencyField(doc, colX(1), cy + 54, colW(1), "Desconto incondicionado", 0);
      drawCurrencyField(doc, colX(2), cy + 54, colW(2), "Total Deduções/Reduções", 0);
      drawCurrencyField(doc, colX(3), cy + 54, colW(3), "Cálculo do BM", 0);

      drawCurrencyField(doc, colX(0), cy + 74, colW(0), "BC ISSQN", input.valor);
      drawField(doc, colX(1), cy + 74, colW(1), "Alíquota Aplicada %", "");
      drawField(doc, colX(2), cy + 74, colW(2), "Retenção do ISSQN", "Não Retido");
      drawCurrencyField(doc, colX(3), cy + 74, colW(3), "ISSQN Apurado", 0);

      drawHLine(doc, cy + 94);
      drawSectionHeader(doc, cy + 98, "TRIBUTAÇÃO FEDERAL", 10);
      drawCurrencyField(doc, colX(0), cy + 108, colW(0), "IRRF", 0);
      drawCurrencyField(doc, colX(1), cy + 108, colW(1), "Contribuição Previdenciária - Retida", 0);
      drawCurrencyField(doc, colX(2), cy + 108, colW(2), "Contribuições Sociais - Retidas", 0);
      drawField(doc, colX(3), cy + 108, colW(3), "Descrição Contrib. Sociais - Retidas", "Não Retido");
      drawCurrencyField(doc, colX(0), cy + 128, colW(0), "PIS - Débito Apuração Própria", 0);
      drawCurrencyField(doc, colX(1), cy + 128, colW(1), "COFINS - Débito Apuração Própria", 0);
    });
  }

  // Valor total
  {
    const innerHeight = 12 + 20 + 20 + 4 + 10 + fieldBlockHeight() + 2;
    y = drawBand(doc, y, innerHeight, (cy) => {
      drawSectionHeader(doc, cy, "VALOR TOTAL DA NFS-E", 10);
      drawCurrencyField(doc, colX(0), cy + 12, colW(0), "Valor do Serviço", input.valor);
      drawCurrencyField(doc, colX(1), cy + 12, colW(1), "Desconto Condicionado", 0);
      drawCurrencyField(doc, colX(2), cy + 12, colW(2), "Desconto Incondicionado", 0);
      drawField(doc, colX(3), cy + 12, colW(3), "ISSQN Retido", "");

      drawCurrencyField(doc, colX(0), cy + 32, colW(0), "IRRF, CP, CSLL - Retidos", 0);
      drawCurrencyField(doc, colX(1), cy + 32, COL2 + COL3, "PIS/COFINS Retidos", 0);
      drawCurrencyField(doc, colX(3), cy + 32, colW(3), "Valor Líquido da NFS-e", input.valor);

      drawHLine(doc, cy + 54);
      drawSectionHeader(doc, cy + 58, "TOTAIS APROXIMADOS DOS TRIBUTOS", 10);
      drawField(doc, MARGIN, cy + 70, 184, "Federais", `${fmtCurrency(pTot)}% (SN)`);
      drawField(doc, MARGIN + 184, cy + 70, 185, "Estaduais", "");
      drawField(doc, MARGIN + 369, cy + 70, 186, "Municipais", "");
    });
  }

  // Info complementares
  {
    const nbsLine = `${cNbs} — ${FISCAL_DEFAULTS.xNbs}`;
    const innerHeight = 12 + fieldBlockHeight() + 4;
    y = drawBand(doc, y, innerHeight, (cy) => {
      drawSectionHeader(doc, cy, "INFORMAÇÕES COMPLEMENTARES", 10);
      drawField(doc, MARGIN, cy + 12, CONTENT_WIDTH, "NBS", nbsLine);
    });
  }

  doc
    .font(FONT)
    .fontSize(5)
    .fillColor("#666")
    .text(
      input.simulado
        ? "HOMOLOGAÇÃO — Documento simulado sem valor fiscal. Layout conforme Nota Técnica DANFSe / padrão nacional NFS-e."
        : "Documento gerado localmente conforme padrão nacional DANFSe. Consulte a autenticidade pelo QR Code ou no portal nacional da NFS-e.",
      MARGIN,
      y + 6,
      { width: CONTENT_WIDTH, align: "center" },
    );

  doc.end();
  return finished;
}
