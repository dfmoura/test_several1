/**
 * PDFs comerciais e fiscais (homologação).
 * DANFE / DANFSe alinhados aos modelos em `modelos/nfe` e `modelos/nfse`.
 */

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Empresa } from "@prisma/client";
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

function formatChaveGrupos(chave: string | null | undefined): string {
  if (!chave) return "—";
  return chave.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
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

function label(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w?: number) {
  doc
    .fillColor(MUTED)
    .fontSize(6)
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
  label(doc, title, x + 3, y + 2, w - 6);
  doc
    .fillColor(INK)
    .fontSize(8)
    .font("Helvetica")
    .text(value || "—", x + 3, y + 11, { width: w - 6, height: h - 14 });
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

/** DANFSe — layout próximo ao modelo nacional (modelos/nfse). */
export async function buildDanfsePdf(opts: {
  empresa: EmpresaPdf;
  tomadorNome: string;
  tomadorDoc?: string | null;
  tomadorEndereco?: string | null;
  tomadorCidadeUf?: string | null;
  tomadorCep?: string | null;
  tomadorEmail?: string | null;
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
  const doc = new PDFDocument({
    size: "A4",
    margin: 28,
    info: { Title: `DANFSe ${opts.numero}`, Author: opts.empresa.razaoSocial },
  });
  const L = 28;
  const W = 539;
  let y = 28;

  box(doc, L, y, W, 36, { fill: BOX_BG });
  doc
    .fillColor(ACCENT)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("DANFSe v1.0 — Documento Auxiliar da NFS-e", L + 8, y + 8, { width: 320 });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(`Prefeitura Municipal de ${opts.empresa.cidade || "Uberlândia"}`, L + 8, y + 22);
  if (opts.simulado) {
    doc
      .fillColor("#8a5a00")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("HOMOLOGAÇÃO · SIMULADO", L + 340, y + 12, { width: 190, align: "right" });
  }
  y += 42;

  cell(doc, "Chave de Acesso da NFS-e", formatChaveGrupos(opts.chave), L, y, W, 28);
  y += 30;

  const col = W / 3;
  cell(doc, "Número da NFS-e", opts.numero, L, y, col, 28);
  cell(doc, "Competência", fmtDate(opts.autorizadoEm), L + col, y, col, 28);
  cell(doc, "Emissão", fmtDateTime(opts.autorizadoEm), L + col * 2, y, col, 28);
  y += 30;
  cell(doc, "Número da DPS", opts.dpsNumero || opts.numero, L, y, col, 28);
  cell(doc, "Série da DPS", opts.serie, L + col, y, col, 28);
  cell(doc, "Data/Hora DPS", fmtDateTime(opts.autorizadoEm), L + col * 2, y, col, 28);
  y += 36;

  doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("EMITENTE DA NFS-e — Prestador", L, y);
  y += 12;
  box(doc, L, y, W, 72);
  doc
    .fillColor(INK)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(opts.empresa.razaoSocial, L + 6, y + 6, { width: W - 12 });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      `CNPJ ${formatDocumento(opts.empresa.cnpj)}  ·  IM ${opts.empresa.inscricaoMunicipal || "—"}  ·  ${opts.empresa.email || ""}`,
      L + 6,
      y + 20,
      { width: W - 12 },
    );
  doc.text(enderecoEmpresa(opts.empresa).replace(/\n/g, " · "), L + 6, y + 34, {
    width: W - 12,
  });
  doc.text("Simples Nacional — Optante ME/EPP", L + 6, y + 54);
  y += 80;

  doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("TOMADOR DO SERVIÇO", L, y);
  y += 12;
  box(doc, L, y, W, 52);
  doc
    .fillColor(INK)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(opts.tomadorNome, L + 6, y + 6, { width: W - 12 });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      `CNPJ/CPF ${opts.tomadorDoc ? formatDocumento(opts.tomadorDoc) : "—"}  ·  ${opts.tomadorEmail || ""}`,
      L + 6,
      y + 20,
    );
  doc.text(
    [opts.tomadorEndereco, opts.tomadorCidadeUf, opts.tomadorCep ? `CEP ${formatCep(opts.tomadorCep)}` : ""]
      .filter(Boolean)
      .join(" · ") || "Endereço não informado",
    L + 6,
    y + 34,
    { width: W - 12 },
  );
  y += 60;

  doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("SERVIÇO PRESTADO", L, y);
  y += 12;
  const trib = opts.cTribNac || "130501";
  cell(doc, "Código de Tributação Nacional", `${trib} — Composição gráfica`, L, y, W * 0.55, 32);
  cell(
    doc,
    "Local da Prestação",
    `${opts.empresa.cidade || "Uberlândia"} - ${opts.empresa.uf || "MG"}`,
    L + W * 0.55,
    y,
    W * 0.45,
    32,
  );
  y += 34;
  box(doc, L, y, W, 70);
  label(doc, "Descrição do Serviço", L + 4, y + 3);
  doc
    .fillColor(INK)
    .fontSize(8)
    .font("Helvetica")
    .text(opts.discriminacao, L + 4, y + 14, { width: W - 8, height: 52 });
  y += 78;

  doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("VALORES", L, y);
  y += 12;
  cell(doc, "Valor do Serviço", formatBrl(opts.valor), L, y, W / 3, 32);
  cell(doc, "ISSQN Retido", "Não retido", L + W / 3, y, W / 3, 32);
  cell(doc, "Valor Líquido da NFS-e", formatBrl(opts.valor), L + (W * 2) / 3, y, W / 3, 32);
  y += 40;

  box(doc, L, y, W, 36, { fill: BOX_BG });
  doc
    .fillColor(INK)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(`VALOR TOTAL DA NFS-e  ${formatBrl(opts.valor)}`, L + 8, y + 12, {
      width: W - 16,
      align: "right",
    });
  y += 44;

  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text(
      `NBS: ${opts.cNbs || "121012100"}  ·  Autenticidade: portal nacional da NFS-e  ·  ${
        opts.simulado ? "Documento simulado — sem valor fiscal." : "Documento auxiliar."
      }`,
      L,
      y,
      { width: W },
    );

  return bufferFromPdf(doc);
}

/** DANFE — layout clássico próximo aos modelos em `modelos/nfe`. */
export async function buildDanfePdf(opts: {
  empresa: EmpresaPdf;
  destinatarioNome: string;
  destinatarioDoc?: string | null;
  destinatarioEndereco?: string | null;
  destinatarioBairro?: string | null;
  destinatarioCidade?: string | null;
  destinatarioUf?: string | null;
  destinatarioCep?: string | null;
  destinatarioIe?: string | null;
  numero: string;
  serie: string;
  chave: string | null;
  valor: number;
  naturezaOperacao?: string;
  protocolo?: string | null;
  autorizadoEm?: Date | null;
  itens: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    infAdProd?: string | null;
  }>;
  simulado: boolean;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 22,
    info: { Title: `DANFE ${opts.numero}`, Author: opts.empresa.razaoSocial },
  });
  const L = 22;
  const W = 551;
  let y = 22;

  // Canhoto
  box(doc, L, y, W * 0.72, 42);
  doc
    .fillColor(MUTED)
    .fontSize(6)
    .text(
      `RECEBEMOS DE ${opts.empresa.razaoSocial.toUpperCase()} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO.`,
      L + 4,
      y + 4,
      { width: W * 0.72 - 8 },
    );
  doc
    .fillColor(INK)
    .fontSize(7)
    .text(
      `EMISSÃO: ${fmtDate(opts.autorizadoEm)}   VALOR: ${formatBrl(opts.valor)}   DEST.: ${opts.destinatarioNome}`,
      L + 4,
      y + 28,
      { width: W * 0.72 - 8 },
    );
  box(doc, L + W * 0.72, y, W * 0.28, 42);
  doc
    .fillColor(INK)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("NF-e", L + W * 0.72 + 6, y + 6);
  doc
    .fontSize(8)
    .font("Helvetica")
    .text(`Nº ${opts.numero}`, L + W * 0.72 + 6, y + 18);
  doc.text(`Série ${opts.serie}`, L + W * 0.72 + 6, y + 28);
  y += 48;

  // Cabeçalho emitente + DANFE
  box(doc, L, y, W * 0.48, 78);
  const logo = resolveLogoPath();
  if (logo) {
    try {
      doc.image(logo, L + 6, y + 6, { height: 28 });
    } catch {
      /* ignore */
    }
  }
  doc
    .fillColor(INK)
    .fontSize(8)
    .font("Helvetica-Bold")
    .text(opts.empresa.razaoSocial, L + 6, y + (logo ? 38 : 8), { width: W * 0.48 - 12 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(MUTED)
    .text(enderecoEmpresa(opts.empresa), L + 6, y + (logo ? 50 : 22), {
      width: W * 0.48 - 12,
    });

  box(doc, L + W * 0.48, y, W * 0.22, 78);
  doc
    .fillColor(INK)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("DANFE", L + W * 0.48 + 8, y + 8);
  doc
    .fontSize(6)
    .font("Helvetica")
    .text("Documento Auxiliar da Nota Fiscal Eletrônica", L + W * 0.48 + 8, y + 22, {
      width: W * 0.22 - 12,
    });
  doc.fontSize(8).text("0 - ENTRADA", L + W * 0.48 + 8, y + 42);
  doc.font("Helvetica-Bold").text("1 - SAÍDA    1", L + W * 0.48 + 8, y + 54);
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(`Nº ${opts.numero}  Série ${opts.serie}`, L + W * 0.48 + 8, y + 66);

  box(doc, L + W * 0.7, y, W * 0.3, 78);
  label(doc, "Chave de Acesso", L + W * 0.7 + 4, y + 4, W * 0.3 - 8);
  doc
    .fillColor(INK)
    .fontSize(7)
    .font("Helvetica")
    .text(formatChaveGrupos(opts.chave), L + W * 0.7 + 4, y + 16, {
      width: W * 0.3 - 8,
    });
  doc
    .fillColor(MUTED)
    .fontSize(6)
    .text("Consulta de autenticidade no portal nacional da NF-e", L + W * 0.7 + 4, y + 52, {
      width: W * 0.3 - 8,
    });
  if (opts.simulado) {
    doc
      .fillColor("#8a5a00")
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("HOMOLOGAÇÃO", L + W * 0.7 + 4, y + 66);
  }
  y += 80;

  cell(
    doc,
    "Natureza da Operação",
    opts.naturezaOperacao || "VENDA DE PRODUCAO DO ESTABELECIMENTO",
    L,
    y,
    W * 0.55,
    26,
  );
  cell(
    doc,
    "Protocolo de Autorização",
    `${opts.protocolo || "—"} - ${fmtDateTime(opts.autorizadoEm)}`,
    L + W * 0.55,
    y,
    W * 0.45,
    26,
  );
  y += 28;
  cell(doc, "IE", opts.empresa.inscricaoEstadual || "ISENTO", L, y, W / 3, 24);
  cell(doc, "IE do Subst. Tribut.", "—", L + W / 3, y, W / 3, 24);
  cell(doc, "CNPJ", formatDocumento(opts.empresa.cnpj), L + (W * 2) / 3, y, W / 3, 24);
  y += 30;

  doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text("DESTINATÁRIO / REMETENTE", L, y);
  y += 10;
  cell(doc, "Nome / Razão Social", opts.destinatarioNome, L, y, W * 0.62, 26);
  cell(
    doc,
    "CNPJ / CPF",
    opts.destinatarioDoc ? formatDocumento(opts.destinatarioDoc) : "—",
    L + W * 0.62,
    y,
    W * 0.2,
    26,
  );
  cell(doc, "Data Emissão", fmtDate(opts.autorizadoEm), L + W * 0.82, y, W * 0.18, 26);
  y += 28;
  cell(
    doc,
    "Endereço",
    opts.destinatarioEndereco || "—",
    L,
    y,
    W * 0.5,
    26,
  );
  cell(doc, "Bairro", opts.destinatarioBairro || "—", L + W * 0.5, y, W * 0.2, 26);
  cell(
    doc,
    "CEP",
    opts.destinatarioCep ? formatCep(opts.destinatarioCep) : "—",
    L + W * 0.7,
    y,
    W * 0.15,
    26,
  );
  cell(doc, "Data Saída", "—", L + W * 0.85, y, W * 0.15, 26);
  y += 28;
  cell(
    doc,
    "Município",
    opts.destinatarioCidade || "—",
    L,
    y,
    W * 0.4,
    24,
  );
  cell(doc, "UF", opts.destinatarioUf || "—", L + W * 0.4, y, W * 0.1, 24);
  cell(doc, "IE", opts.destinatarioIe || "—", L + W * 0.5, y, W * 0.25, 24);
  cell(doc, "Hora Saída", "—", L + W * 0.75, y, W * 0.25, 24);
  y += 30;

  doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text("CÁLCULO DO IMPOSTO", L, y);
  y += 10;
  const taxW = W / 6;
  cell(doc, "Base ICMS", "0,00", L, y, taxW, 24);
  cell(doc, "Valor ICMS", "0,00", L + taxW, y, taxW, 24);
  cell(doc, "Base ICMS ST", "0,00", L + taxW * 2, y, taxW, 24);
  cell(doc, "ICMS ST", "0,00", L + taxW * 3, y, taxW, 24);
  cell(doc, "V. Total Produtos", formatBrl(opts.valor), L + taxW * 4, y, taxW, 24);
  cell(doc, "V. Total da Nota", formatBrl(opts.valor), L + taxW * 5, y, taxW, 24);
  y += 30;

  cell(doc, "Frete", "0,00", L, y, taxW, 24);
  cell(doc, "Seguro", "0,00", L + taxW, y, taxW, 24);
  cell(doc, "Desconto", "0,00", L + taxW * 2, y, taxW, 24);
  cell(doc, "Outras", "0,00", L + taxW * 3, y, taxW, 24);
  cell(doc, "IPI", "0,00", L + taxW * 4, y, taxW, 24);
  cell(doc, "Frete (mod.)", "9-Sem Transporte", L + taxW * 5, y, taxW, 24);
  y += 30;

  doc.fillColor(ACCENT).fontSize(8).font("Helvetica-Bold").text("DADOS DOS PRODUTOS / SERVIÇOS", L, y);
  y += 10;
  box(doc, L, y, W, 14, { fill: BOX_BG });
  doc.fillColor(MUTED).fontSize(6).font("Helvetica-Bold");
  const cols = [
    { t: "CÓD", x: L + 2, w: 28 },
    { t: "DESCRIÇÃO", x: L + 32, w: 180 },
    { t: "NCM", x: L + 214, w: 42 },
    { t: "CSOSN", x: L + 258, w: 30 },
    { t: "CFOP", x: L + 290, w: 28 },
    { t: "UN", x: L + 320, w: 20 },
    { t: "QTDE", x: L + 342, w: 48 },
    { t: "V.UNIT", x: L + 392, w: 52 },
    { t: "V.TOTAL", x: L + 446, w: 52 },
  ];
  for (const c of cols) doc.text(c.t, c.x, y + 4, { width: c.w });
  y += 14;

  for (const it of opts.itens) {
    const h = it.infAdProd ? 28 : 16;
    if (y + h > 780) {
      doc.addPage();
      y = 28;
    }
    box(doc, L, y, W, h);
    doc.fillColor(INK).fontSize(7).font("Helvetica");
    doc.text(it.codigo, L + 2, y + 3, { width: 28 });
    doc.text(it.descricao, L + 32, y + 3, { width: 180, height: 12 });
    doc.text(it.ncm, L + 214, y + 3, { width: 42 });
    doc.text("102", L + 258, y + 3, { width: 30 });
    doc.text(it.cfop, L + 290, y + 3, { width: 28 });
    doc.text(it.unidade, L + 320, y + 3, { width: 20 });
    doc.text(formatQtde(it.quantidade), L + 342, y + 3, { width: 48 });
    doc.text(
      it.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 4 }),
      L + 392,
      y + 3,
      { width: 52 },
    );
    doc.text(formatBrl(it.valorTotal), L + 446, y + 3, { width: 52 });
    if (it.infAdProd) {
      doc
        .fillColor(MUTED)
        .fontSize(6)
        .text(it.infAdProd, L + 32, y + 15, { width: W - 40, height: 10 });
    }
    y += h;
  }
  y += 8;

  box(doc, L, y, W, 48);
  label(doc, "Dados Adicionais / Informações Complementares", L + 4, y + 3);
  doc
    .fillColor(MUTED)
    .fontSize(7)
    .font("Helvetica")
    .text(
      `Documento emitido por ME ou EPP optante pelo Simples Nacional.${
        opts.simulado ? " HOMOLOGAÇÃO Focus NFe — documento simulado, sem valor fiscal." : ""
      }`,
      L + 4,
      y + 14,
      { width: W - 8 },
    );

  return bufferFromPdf(doc);
}

/** Pedido de venda — documento comercial profissional. */
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
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Pedido ${opts.numero}`,
      Author: opts.empresa?.nomeFantasia || "Reta Etiquetas",
    },
  });
  const emp = opts.empresa;
  const L = 40;
  const W = 515;
  let y = 40;

  const logo = resolveLogoPath();
  if (logo) {
    try {
      doc.image(logo, L, y, { height: 36 });
    } catch {
      /* ignore */
    }
  }
  doc
    .fillColor(ACCENT)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(emp?.nomeFantasia || emp?.razaoSocial || "Pedido de venda", logo ? L + 110 : L, y, {
      width: 280,
    });
  if (emp) {
    doc
      .fillColor(MUTED)
      .fontSize(8)
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
        logo ? L + 110 : L,
        y + 20,
        { width: 280 },
      );
  }
  doc
    .fillColor(BRAND)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(`PEDIDO Nº ${opts.numero}`, L + 360, y, { width: 155, align: "right" });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(`${opts.statusLabel}\n${fmtDateTime(opts.createdAt)}`, L + 360, y + 16, {
      width: 155,
      align: "right",
    });
  y += 58;
  doc.save().strokeColor("#d5e0da").lineWidth(1).moveTo(L, y).lineTo(L + W, y).stroke().restore();
  y += 14;

  // Cliente / vendedor
  box(doc, L, y, W * 0.62, 56, { fill: "#f4f8f6" });
  label(doc, "Cliente", L + 8, y + 6);
  doc
    .fillColor(INK)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(opts.clienteNome, L + 8, y + 18, { width: W * 0.62 - 16 });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(
      [
        opts.clienteDoc ? `Doc. ${formatDocumento(opts.clienteDoc)}` : null,
        opts.clienteEndereco,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
      L + 8,
      y + 36,
      { width: W * 0.62 - 16 },
    );
  box(doc, L + W * 0.62, y, W * 0.38, 56, { fill: "#f4f8f6" });
  label(doc, "Vendedor", L + W * 0.62 + 8, y + 6);
  doc
    .fillColor(INK)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(opts.vendedorNome || "—", L + W * 0.62 + 8, y + 18, { width: W * 0.38 - 16 });
  if (opts.osNumero) {
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font("Helvetica")
      .text(`OS ${opts.osNumero} · ${opts.osStatus || ""}`, L + W * 0.62 + 8, y + 36);
  }
  y += 68;

  // Specs técnicas
  if (opts.specs?.length) {
    doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("Especificação", L, y);
    y += 12;
    const perRow = 3;
    const cellW = W / perRow;
    for (let i = 0; i < opts.specs.length; i += perRow) {
      const row = opts.specs.slice(i, i + perRow);
      for (let j = 0; j < row.length; j++) {
        cell(doc, row[j].label, row[j].value, L + j * cellW, y, cellW, 28);
      }
      y += 30;
    }
    y += 4;
  }

  doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("Itens", L, y);
  y += 10;
  box(doc, L, y, W, 16, { fill: "#1f3d30" });
  doc.fillColor("#fff").fontSize(7).font("Helvetica-Bold");
  doc.text("DESCRIÇÃO", L + 6, y + 4, { width: 260 });
  doc.text("QTDE", L + 280, y + 4, { width: 60 });
  doc.text("UNITÁRIO", L + 350, y + 4, { width: 70 });
  doc.text("TOTAL", L + 430, y + 4, { width: 70, align: "right" });
  y += 16;

  for (const it of opts.itens) {
    const h = Math.max(22, doc.heightOfString(it.descricao, { width: 260 }) + 8);
    box(doc, L, y, W, h);
    doc.fillColor(INK).fontSize(8).font("Helvetica").text(it.descricao, L + 6, y + 5, {
      width: 260,
    });
    doc.text(`${formatQtde(it.quantidade)} ${it.unidade || "UN"}`, L + 280, y + 5, {
      width: 60,
    });
    doc.text(formatBrl(it.valorUnitario), L + 350, y + 5, { width: 70 });
    doc.text(formatBrl(it.valorTotal), L + 430, y + 5, { width: 70, align: "right" });
    y += h;
  }
  y += 10;

  box(doc, L + W * 0.55, y, W * 0.45, 40, { fill: "#f4f8f6" });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text("Total do pedido", L + W * 0.55 + 10, y + 8);
  doc
    .fillColor(ACCENT)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(formatBrl(opts.valorTotal), L + W * 0.55 + 10, y + 20, {
      width: W * 0.45 - 20,
      align: "right",
    });

  const metaY = y;
  doc.fillColor(MUTED).fontSize(8).font("Helvetica");
  if (opts.condicaoPagamento) {
    doc.text(`Pagamento: ${opts.condicaoPagamento}`, L, metaY + 4);
  }
  if (opts.prazoEntregaDias) {
    doc.text(`Prazo: ${opts.prazoEntregaDias} dias úteis`, L, metaY + 16);
  }
  if (opts.fiscalResumo) {
    doc.text(`Fiscal: ${opts.fiscalResumo}`, L, metaY + 28, { width: W * 0.5 });
  }
  y += 52;

  if (opts.discriminacao) {
    label(doc, "Discriminação fiscal (referência)", L, y);
    y += 10;
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font("Helvetica")
      .text(opts.discriminacao, L, y, { width: W });
    y += 28;
  }
  if (opts.observacoes) {
    label(doc, "Observações", L, y);
    y += 10;
    doc.fillColor(MUTED).fontSize(8).text(opts.observacoes, L, y, { width: W });
  }

  doc
    .fillColor(MUTED)
    .fontSize(7)
    .text("Documento comercial interno — não substitui NF-e / NFS-e.", L, 800, {
      width: W,
      align: "center",
    });

  return bufferFromPdf(doc);
}

/** Ordem de serviço — documento de PCP/produção. */
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
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `OS ${opts.osNumero}`,
      Author: opts.empresa?.nomeFantasia || "Reta Etiquetas",
    },
  });
  const L = 40;
  const W = 515;
  let y = 40;
  const emp = opts.empresa;
  const logo = resolveLogoPath();

  if (logo) {
    try {
      doc.image(logo, L, y, { height: 32 });
    } catch {
      /* ignore */
    }
  }
  doc
    .fillColor(ACCENT)
    .fontSize(15)
    .font("Helvetica-Bold")
    .text("ORDEM DE SERVIÇO", logo ? L + 100 : L, y + 2);
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(emp?.nomeFantasia || emp?.razaoSocial || "", logo ? L + 100 : L, y + 20);
  doc
    .fillColor(BRAND)
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(`OS ${opts.osNumero}`, L + 360, y, { width: 155, align: "right" });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text(opts.osStatus, L + 360, y + 24, { width: 155, align: "right" });
  y += 48;
  doc.save().strokeColor("#d5e0da").moveTo(L, y).lineTo(L + W, y).stroke().restore();
  y += 12;

  cell(doc, "Pedido", String(opts.pedidoNumero), L, y, W / 4, 30);
  cell(doc, "Cliente", opts.clienteNome, L + W / 4, y, W / 2, 30);
  cell(doc, "Quantidade", formatQtde(opts.quantidade), L + (W * 3) / 4, y, W / 4, 30);
  y += 32;
  cell(doc, "Abertura", fmtDateTime(opts.createdAt), L, y, W / 3, 28);
  cell(doc, "Início produção", fmtDateTime(opts.iniciadoEm), L + W / 3, y, W / 3, 28);
  cell(doc, "Conclusão", fmtDateTime(opts.concluidoEm), L + (W * 2) / 3, y, W / 3, 28);
  y += 40;

  doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("Dados técnicos", L, y);
  y += 12;
  const perRow = 3;
  const cellW = W / perRow;
  for (let i = 0; i < opts.specs.length; i += perRow) {
    const row = opts.specs.slice(i, i + perRow);
    for (let j = 0; j < row.length; j++) {
      cell(doc, row[j].label, row[j].value || "—", L + j * cellW, y, cellW, 28);
    }
    y += 30;
  }
  y += 8;

  doc.fillColor(ACCENT).fontSize(9).font("Helvetica-Bold").text("Materiais / MRP", L, y);
  y += 10;
  box(doc, L, y, W, 16, { fill: "#1f3d30" });
  doc.fillColor("#fff").fontSize(7).font("Helvetica-Bold");
  doc.text("MATERIAL", L + 6, y + 4, { width: 200 });
  doc.text("CÓD.", L + 210, y + 4, { width: 60 });
  doc.text("NEC.", L + 280, y + 4, { width: 60 });
  doc.text("RES.", L + 350, y + 4, { width: 60 });
  doc.text("STATUS", L + 420, y + 4, { width: 80 });
  y += 16;

  for (const m of opts.materiais) {
    box(doc, L, y, W, 18);
    doc.fillColor(INK).fontSize(8).font("Helvetica");
    doc.text(m.descricao, L + 6, y + 5, { width: 200 });
    doc.text(m.produtoCodigo || "—", L + 210, y + 5, { width: 60 });
    doc.text(`${m.qtdNecessaria} ${m.unidade}`, L + 280, y + 5, { width: 60 });
    doc.text(String(m.qtdReservada), L + 350, y + 5, { width: 60 });
    doc.text(m.status, L + 420, y + 5, { width: 80 });
    y += 18;
  }
  y += 16;

  // Assinaturas
  doc.fillColor(MUTED).fontSize(8).text("PCP / Produção", L, y);
  doc.text("Qualidade", L + 180, y);
  doc.text("Expedição", L + 360, y);
  y += 28;
  doc.save().strokeColor(LINE).moveTo(L, y).lineTo(L + 120, y).stroke();
  doc.moveTo(L + 180, y).lineTo(L + 300, y).stroke();
  doc.moveTo(L + 360, y).lineTo(L + 480, y).stroke().restore();

  if (opts.observacoes) {
    y += 20;
    label(doc, "Observações", L, y);
    y += 10;
    doc.fillColor(MUTED).fontSize(8).text(opts.observacoes, L, y, { width: W });
  }

  doc
    .fillColor(MUTED)
    .fontSize(7)
    .text("Documento interno de produção — Orçamento Flexo", L, 800, {
      width: W,
      align: "center",
    });

  return bufferFromPdf(doc);
}
