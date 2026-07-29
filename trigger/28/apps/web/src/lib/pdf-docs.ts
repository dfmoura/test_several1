/**
 * PDFs comerciais e fiscais (homologação).
 * DANFE / DANFSe alinhados aos modelos em `modelos/nfe` e `modelos/nfse`.
 * DANFE: layout clássico MOC (barcode + fatura + transporte + dados adicionais).
 * DANFSe: layout nacional v2 (Courier + QR).
 */

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Empresa } from "@prisma/client";
import { renderDanfe, type DanfeInput } from "@/lib/fiscal/danfe";
import { renderDanfseV2 } from "@/lib/fiscal/danfse-v2";
import { formatBrl, formatQtde } from "@/lib/orcamento-comercial";
import { formatCep, formatDocumento } from "@/lib/parceiros";

const INK = "#1a1a1a";
const MUTED = "#4a4a4a";
const LINE = "#222";
const BOX_BG = "#f7f7f7";
const ACCENT = "#1f3d30";
const BRAND = "#2d6b4f";

function bufferFromPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "public/brand/logotipo-retaetiquetas.png"),
    path.join(process.cwd(), "apps/web/public/brand/logotipo-retaetiquetas.png"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

type EmpresaPdf = Pick<
  Empresa,
  | "nomeFantasia"
  | "razaoSocial"
  | "cnpj"
  | "inscricaoEstadual"
  | "inscricaoMunicipal"
  | "email"
  | "telefone"
  | "logradouro"
  | "numero"
  | "bairro"
  | "cidade"
  | "uf"
  | "cep"
>;

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}

function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("pt-BR");
}

function box(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { fill?: string },
) {
  doc.save();
  if (opts?.fill) doc.rect(x, y, w, h).fill(opts.fill);
  doc.rect(x, y, w, h).strokeColor(LINE).lineWidth(0.6).stroke();
  doc.restore();
}

/** Página útil A4 com margem compacta (documentos comerciais ERP). */
const COMMERCIAL = {
  margin: 28,
  contentW: 539,
  pageBottom: 812,
  footerY: 820,
};

function label(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w?: number) {
  doc
    .fillColor(MUTED)
    .fontSize(5.5)
    .font("Helvetica")
    .text(text.toUpperCase(), x, y, { width: w, lineGap: 0 });
}

function cell(
  doc: PDFKit.PDFDocument,
  title: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  box(doc, x, y, w, h);
  label(doc, title, x + 3, y + 1.5, w - 6);
  doc
    .fillColor(INK)
    .fontSize(7.5)
    .font("Helvetica")
    .text(value || "—", x + 3, y + 10, { width: w - 6, height: h - 12, lineGap: 0 });
}

function ensureY(
  doc: PDFKit.PDFDocument,
  y: number,
  need: number,
  margin = COMMERCIAL.margin,
): number {
  if (y + need <= COMMERCIAL.pageBottom) return y;
  doc.addPage();
  return margin;
}

function enderecoEmpresa(e: EmpresaPdf): string {
  return [
    [e.logradouro, e.numero].filter(Boolean).join(", "),
    e.bairro,
    e.cep ? formatCep(e.cep) : "",
    e.cidade && e.uf ? `${e.cidade} - ${e.uf}` : e.cidade || e.uf,
    e.telefone ? `Fone: ${e.telefone}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** DANFSe — layout nacional v2 (Courier + QR + grades oficiais). */
export async function buildDanfsePdf(opts: {
  empresa: EmpresaPdf;
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
}): Promise<Buffer> {
  return renderDanfseV2({
    empresa: opts.empresa,
    tomadorNome: opts.tomadorNome,
    tomadorDoc: opts.tomadorDoc,
    tomadorEndereco: opts.tomadorEndereco,
    tomadorCidadeUf: opts.tomadorCidadeUf,
    tomadorCep: opts.tomadorCep,
    tomadorEmail: opts.tomadorEmail,
    tomadorTelefone: opts.tomadorTelefone,
    numero: opts.numero,
    serie: opts.serie,
    chave: opts.chave,
    valor: opts.valor,
    discriminacao: opts.discriminacao,
    cTribNac: opts.cTribNac,
    cNbs: opts.cNbs,
    simulado: opts.simulado,
    autorizadoEm: opts.autorizadoEm,
    dpsNumero: opts.dpsNumero,
  });
}

/** DANFE — layout MOC próximo aos modelos em `modelos/nfe` + Focus NFe. */
export async function buildDanfePdf(opts: DanfeInput): Promise<Buffer> {
  return renderDanfe(opts);
}

/** Pedido de venda — documento comercial profissional (densidade ERP). */
export async function buildPedidoPdf(opts: {
  empresa: EmpresaPdf | null;
  numero: number;
  statusLabel: string;
  clienteNome: string;
  clienteDoc?: string | null;
  clienteEndereco?: string | null;
  vendedorNome: string;
  quantidade: number;
  valorTotal: number;
  valorUnitario?: number;
  condicaoPagamento: string | null;
  prazoEntregaDias?: number | null;
  createdAt: Date;
  observacoes?: string | null;
  specs?: Array<{ label: string; value: string }>;
  itens: Array<{
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    unidade?: string;
  }>;
  osNumero?: number | null;
  osStatus?: string | null;
  fiscalResumo?: string | null;
  discriminacao?: string | null;
}): Promise<Buffer> {
  const M = COMMERCIAL.margin;
  const doc = new PDFDocument({
    size: "A4",
    margin: M,
    info: {
      Title: `Pedido ${opts.numero}`,
      Author: opts.empresa?.nomeFantasia || "Reta Etiquetas",
    },
  });
  const emp = opts.empresa;
  const L = M;
  const W = COMMERCIAL.contentW;
  let y: number = M;

  const logo = resolveLogoPath();
  if (logo) {
    try {
      doc.image(logo, L, y, { height: 28 });
    } catch {
      /* ignore */
    }
  }
  doc
    .fillColor(ACCENT)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(emp?.nomeFantasia || emp?.razaoSocial || "Pedido de venda", logo ? L + 96 : L, y, {
      width: 290,
    });
  if (emp) {
    doc
      .fillColor(MUTED)
      .fontSize(7)
      .font("Helvetica")
      .text(
        `${emp.razaoSocial} · CNPJ ${formatDocumento(emp.cnpj)}\n${[
          emp.logradouro,
          emp.numero,
          emp.cidade,
          emp.uf,
        ]
          .filter(Boolean)
          .join(" · ")}`,
        logo ? L + 96 : L,
        y + 16,
        { width: 290 },
      );
  }
  doc
    .fillColor(BRAND)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`PEDIDO Nº ${opts.numero}`, L + 380, y, { width: W - 380, align: "right" });
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text(`${opts.statusLabel}\n${fmtDateTime(opts.createdAt)}`, L + 380, y + 14, {
      width: W - 380,
      align: "right",
    });
  y += 44;
  doc.save().strokeColor("#d5e0da").lineWidth(0.8).moveTo(L, y).lineTo(L + W, y).stroke().restore();
  y += 8;

  const partyH = 44;
  box(doc, L, y, W * 0.62, partyH, { fill: "#f4f8f6" });
  label(doc, "Cliente", L + 6, y + 4);
  doc
    .fillColor(INK)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(opts.clienteNome, L + 6, y + 14, { width: W * 0.62 - 12 });
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text(
      [
        opts.clienteDoc ? `Doc. ${formatDocumento(opts.clienteDoc)}` : null,
        opts.clienteEndereco,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
      L + 6,
      y + 28,
      { width: W * 0.62 - 12 },
    );
  box(doc, L + W * 0.62, y, W * 0.38, partyH, { fill: "#f4f8f6" });
  label(doc, "Vendedor", L + W * 0.62 + 6, y + 4);
  doc
    .fillColor(INK)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(opts.vendedorNome || "—", L + W * 0.62 + 6, y + 14, { width: W * 0.38 - 12 });
  if (opts.osNumero) {
    doc
      .fillColor(MUTED)
      .fontSize(7)
      .font("Helvetica")
      .text(`OS ${opts.osNumero} · ${opts.osStatus || ""}`, L + W * 0.62 + 6, y + 28);
  }
  y += partyH + 8;

  if (opts.specs?.length) {
    y = ensureY(doc, y, 36);
    doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text("Especificação", L, y);
    y += 9;
    const perRow = 3;
    const cellW = W / perRow;
    for (let i = 0; i < opts.specs.length; i += perRow) {
      y = ensureY(doc, y, 26);
      const row = opts.specs.slice(i, i + perRow);
      for (let j = 0; j < row.length; j++) {
        cell(doc, row[j].label, row[j].value, L + j * cellW, y, cellW, 24);
      }
      y += 24;
    }
    y += 4;
  }

  y = ensureY(doc, y, 40);
  doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text("Itens", L, y);
  y += 8;
  box(doc, L, y, W, 14, { fill: "#1f3d30" });
  doc.fillColor("#fff").fontSize(6.5).font("Helvetica-Bold");
  doc.text("DESCRIÇÃO", L + 5, y + 3.5, { width: 270 });
  doc.text("QTDE", L + 290, y + 3.5, { width: 55 });
  doc.text("UNITÁRIO", L + 360, y + 3.5, { width: 70 });
  doc.text("TOTAL", L + 445, y + 3.5, { width: W - 450, align: "right" });
  y += 14;

  for (const it of opts.itens) {
    const h = Math.max(18, doc.heightOfString(it.descricao, { width: 270 }) + 6);
    y = ensureY(doc, y, h);
    box(doc, L, y, W, h);
    doc.fillColor(INK).fontSize(7.5).font("Helvetica").text(it.descricao, L + 5, y + 4, {
      width: 270,
    });
    doc.text(`${formatQtde(it.quantidade)} ${it.unidade || "UN"}`, L + 290, y + 4, {
      width: 55,
    });
    doc.text(formatBrl(it.valorUnitario), L + 360, y + 4, { width: 70 });
    doc.text(formatBrl(it.valorTotal), L + 445, y + 4, { width: W - 450, align: "right" });
    y += h;
  }
  y += 6;

  y = ensureY(doc, y, 42);
  const totalH = 32;
  box(doc, L + W * 0.55, y, W * 0.45, totalH, { fill: "#f4f8f6" });
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text("Total do pedido", L + W * 0.55 + 8, y + 5);
  doc
    .fillColor(ACCENT)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(formatBrl(opts.valorTotal), L + W * 0.55 + 8, y + 15, {
      width: W * 0.45 - 16,
      align: "right",
    });

  const metaY = y;
  doc.fillColor(MUTED).fontSize(7).font("Helvetica");
  let metaLine = 0;
  if (opts.condicaoPagamento) {
    doc.text(`Pagamento: ${opts.condicaoPagamento}`, L, metaY + 2);
    metaLine += 1;
  }
  if (opts.prazoEntregaDias) {
    doc.text(`Prazo: ${opts.prazoEntregaDias} dias úteis`, L, metaY + 2 + metaLine * 11);
    metaLine += 1;
  }
  if (opts.fiscalResumo) {
    doc.text(`Fiscal: ${opts.fiscalResumo}`, L, metaY + 2 + metaLine * 11, { width: W * 0.52 });
  }
  y += totalH + 8;

  if (opts.discriminacao) {
    y = ensureY(doc, y, 28);
    label(doc, "Discriminação fiscal (referência)", L, y);
    y += 8;
    doc
      .fillColor(MUTED)
      .fontSize(7)
      .font("Helvetica")
      .text(opts.discriminacao, L, y, { width: W });
    y += Math.min(36, doc.heightOfString(opts.discriminacao, { width: W }) + 6);
  }
  if (opts.observacoes) {
    y = ensureY(doc, y, 28);
    label(doc, "Observações", L, y);
    y += 8;
    doc.fillColor(MUTED).fontSize(7).text(opts.observacoes, L, y, { width: W });
  }

  doc
    .fillColor(MUTED)
    .fontSize(6.5)
    .text("Documento comercial interno — não substitui NF-e / NFS-e.", L, COMMERCIAL.footerY, {
      width: W,
      align: "center",
    });

  return bufferFromPdf(doc);
}

/** Ordem de serviço — documento de PCP/produção (densidade ERP). */
export async function buildOrdemServicoPdf(opts: {
  empresa: EmpresaPdf | null;
  osNumero: number;
  osStatus: string;
  pedidoNumero: number;
  clienteNome: string;
  vendedorNome?: string | null;
  createdAt: Date;
  iniciadoEm?: Date | null;
  concluidoEm?: Date | null;
  quantidade: number;
  specs: Array<{ label: string; value: string }>;
  materiais: Array<{
    descricao: string;
    unidade: string;
    qtdNecessaria: number;
    qtdReservada: number;
    status: string;
    produtoCodigo?: string | null;
  }>;
  observacoes?: string | null;
}): Promise<Buffer> {
  const M = COMMERCIAL.margin;
  const doc = new PDFDocument({
    size: "A4",
    margin: M,
    info: {
      Title: `OS ${opts.osNumero}`,
      Author: opts.empresa?.nomeFantasia || "Reta Etiquetas",
    },
  });
  const L = M;
  const W = COMMERCIAL.contentW;
  let y: number = M;
  const emp = opts.empresa;
  const logo = resolveLogoPath();

  if (logo) {
    try {
      doc.image(logo, L, y, { height: 26 });
    } catch {
      /* ignore */
    }
  }
  doc
    .fillColor(ACCENT)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text("ORDEM DE SERVIÇO", logo ? L + 92 : L, y + 1);
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text(emp?.nomeFantasia || emp?.razaoSocial || "", logo ? L + 92 : L, y + 16);
  doc
    .fillColor(BRAND)
    .fontSize(15)
    .font("Helvetica-Bold")
    .text(`OS ${opts.osNumero}`, L + 380, y, { width: W - 380, align: "right" });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(opts.osStatus, L + 380, y + 18, { width: W - 380, align: "right" });
  y += 38;
  doc.save().strokeColor("#d5e0da").lineWidth(0.8).moveTo(L, y).lineTo(L + W, y).stroke().restore();
  y += 8;

  cell(doc, "Pedido", String(opts.pedidoNumero), L, y, W / 4, 24);
  cell(doc, "Cliente", opts.clienteNome, L + W / 4, y, W / 2, 24);
  cell(doc, "Quantidade", formatQtde(opts.quantidade), L + (W * 3) / 4, y, W / 4, 24);
  y += 24;
  cell(doc, "Abertura", fmtDateTime(opts.createdAt), L, y, W / 3, 22);
  cell(doc, "Início produção", fmtDateTime(opts.iniciadoEm), L + W / 3, y, W / 3, 22);
  cell(doc, "Conclusão", fmtDateTime(opts.concluidoEm), L + (W * 2) / 3, y, W / 3, 22);
  y += 28;

  doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text("Dados técnicos", L, y);
  y += 9;
  const perRow = 3;
  const cellW = W / perRow;
  for (let i = 0; i < opts.specs.length; i += perRow) {
    y = ensureY(doc, y, 26);
    const row = opts.specs.slice(i, i + perRow);
    for (let j = 0; j < row.length; j++) {
      cell(doc, row[j].label, row[j].value || "—", L + j * cellW, y, cellW, 24);
    }
    y += 24;
  }
  y += 4;

  y = ensureY(doc, y, 40);
  doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text("Materiais / MRP", L, y);
  y += 8;
  box(doc, L, y, W, 14, { fill: "#1f3d30" });
  doc.fillColor("#fff").fontSize(6.5).font("Helvetica-Bold");
  doc.text("MATERIAL", L + 5, y + 3.5, { width: 210 });
  doc.text("CÓD.", L + 220, y + 3.5, { width: 55 });
  doc.text("NEC.", L + 285, y + 3.5, { width: 55 });
  doc.text("RES.", L + 350, y + 3.5, { width: 55 });
  doc.text("STATUS", L + 420, y + 3.5, { width: W - 425 });
  y += 14;

  for (const m of opts.materiais) {
    y = ensureY(doc, y, 16);
    box(doc, L, y, W, 15);
    doc.fillColor(INK).fontSize(7.5).font("Helvetica");
    doc.text(m.descricao, L + 5, y + 3.5, { width: 210 });
    doc.text(m.produtoCodigo || "—", L + 220, y + 3.5, { width: 55 });
    doc.text(`${m.qtdNecessaria} ${m.unidade}`, L + 285, y + 3.5, { width: 55 });
    doc.text(String(m.qtdReservada), L + 350, y + 3.5, { width: 55 });
    doc.text(m.status, L + 420, y + 3.5, { width: W - 425 });
    y += 15;
  }
  y += 10;

  y = ensureY(doc, y, 36);
  doc.fillColor(MUTED).fontSize(7).text("PCP / Produção", L, y);
  doc.text("Qualidade", L + 180, y);
  doc.text("Expedição", L + 360, y);
  y += 20;
  doc.save().strokeColor(LINE).lineWidth(0.6).moveTo(L, y).lineTo(L + 120, y).stroke();
  doc.moveTo(L + 180, y).lineTo(L + 300, y).stroke();
  doc.moveTo(L + 360, y).lineTo(L + 480, y).stroke().restore();

  if (opts.observacoes) {
    y += 12;
    y = ensureY(doc, y, 28);
    label(doc, "Observações", L, y);
    y += 8;
    doc.fillColor(MUTED).fontSize(7).text(opts.observacoes, L, y, { width: W });
  }

  doc
    .fillColor(MUTED)
    .fontSize(6.5)
    .text("Documento interno de produção — Orçamento Flexo", L, COMMERCIAL.footerY, {
      width: W,
      align: "center",
    });

  return bufferFromPdf(doc);
}

/** PDF Bolepix (boleto + Pix) — homologação no padrão Inter Cobrança. */
export async function buildBolepixPdf(opts: {
  empresa: EmpresaPdf;
  pagadorNome: string;
  pagadorDoc?: string | null;
  pagadorEndereco?: string | null;
  valor: number;
  vencimento: Date;
  nossoNumero: string;
  linhaDigitavel: string;
  pixCopiaECola: string | null;
  seuNumero: string;
  simulado: boolean;
  mensagem?: string | null;
}): Promise<Buffer> {
  const M = COMMERCIAL.margin;
  const doc = new PDFDocument({
    size: "A4",
    margin: M,
    info: { Title: `Bolepix ${opts.seuNumero}`, Author: opts.empresa.razaoSocial },
  });
  const L = M;
  const W = COMMERCIAL.contentW;
  let y: number = M;

  const logo = resolveLogoPath();
  if (logo) {
    try {
      doc.image(logo, L, y, { height: 26 });
    } catch {
      /* ignore */
    }
  }
  doc
    .fillColor(ACCENT)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("BOLEPIX · Banco Inter", logo ? L + 92 : L, y + 1);
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text("Cobrança com boleto + Pix (copia e cola)", logo ? L + 92 : L, y + 16);
  if (opts.simulado) {
    doc
      .fillColor("#8a5a00")
      .fontSize(7)
      .font("Helvetica-Bold")
      .text("HOMOLOGAÇÃO · SIMULADO", L + 350, y + 6, { width: W - 350, align: "right" });
  }
  y += 36;

  box(doc, L, y, W, 48);
  doc
    .fillColor(INK)
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Cedente", L + 6, y + 4);
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(MUTED)
    .text(
      `${opts.empresa.razaoSocial}\nCNPJ ${formatDocumento(opts.empresa.cnpj)}\n${enderecoEmpresa(opts.empresa).replace(/\n/g, " · ")}`,
      L + 6,
      y + 14,
      { width: W - 12 },
    );
  y += 52;

  cell(doc, "Nosso número", opts.nossoNumero, L, y, W / 3, 22);
  cell(doc, "Seu número", opts.seuNumero, L + W / 3, y, W / 3, 22);
  cell(doc, "Vencimento", fmtDate(opts.vencimento), L + (W * 2) / 3, y, W / 3, 22);
  y += 22;
  cell(doc, "Valor do documento", formatBrl(opts.valor), L, y, W / 2, 24);
  cell(doc, "Espécie", "Bolepix (DM)", L + W / 2, y, W / 2, 24);
  y += 28;

  box(doc, L, y, W, 40);
  label(doc, "Pagador", L + 6, y + 3);
  doc
    .fillColor(INK)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(opts.pagadorNome, L + 6, y + 12);
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text(
      [
        opts.pagadorDoc ? `Doc. ${formatDocumento(opts.pagadorDoc)}` : null,
        opts.pagadorEndereco,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
      L + 6,
      y + 25,
      { width: W - 12 },
    );
  y += 44;

  box(doc, L, y, W, 32, { fill: BOX_BG });
  label(doc, "Linha digitável", L + 6, y + 3);
  doc
    .fillColor(INK)
    .fontSize(10)
    .font("Courier-Bold")
    .text(formatLinhaDigitavel(opts.linhaDigitavel), L + 6, y + 13, { width: W - 12 });
  y += 36;

  if (opts.pixCopiaECola) {
    const qr = await QRCode.toBuffer(opts.pixCopiaECola, {
      width: 180,
      margin: 1,
      type: "png",
    });
    box(doc, L, y, W, 108);
    label(doc, "Pix copia e cola", L + 6, y + 3);
    try {
      doc.image(qr, L + 6, y + 14, { width: 82, height: 82 });
    } catch {
      /* ignore */
    }
    doc
      .fillColor(MUTED)
      .fontSize(6)
      .font("Courier")
      .text(opts.pixCopiaECola, L + 98, y + 14, { width: W - 110, height: 86 });
    y += 112;
  }

  if (opts.mensagem) {
    label(doc, "Mensagem", L, y);
    y += 8;
    doc.fillColor(MUTED).fontSize(7).font("Helvetica").text(opts.mensagem, L, y, { width: W });
  }

  doc
    .fillColor(MUTED)
    .fontSize(6.5)
    .text(
      "Referência: developers.inter.co/references/cobranca-bolepix — documento auxiliar de homologação.",
      L,
      COMMERCIAL.footerY,
      { width: W, align: "center" },
    );

  return bufferFromPdf(doc);
}

function formatLinhaDigitavel(linha: string): string {
  const d = linha.replace(/\D/g, "");
  if (d.length !== 47) return linha;
  return (
    `${d.slice(0, 5)}.${d.slice(5, 10)} ` +
    `${d.slice(10, 15)}.${d.slice(15, 21)} ` +
    `${d.slice(21, 26)}.${d.slice(26, 32)} ` +
    `${d.slice(32, 33)} ` +
    d.slice(33)
  );
}
