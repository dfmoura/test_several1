/**
 * DANFE — Documento Auxiliar da NF-e.
 * Layout alinhado aos modelos em `modelos/nfe` e ao Manual de Orientação do Contribuinte.
 * Dados compatíveis com Focus NFe (POST /v2/nfe).
 *
 * @see https://doc.focusnfe.com.br/reference/nfe
 * @see https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html
 */

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { drawCode128C } from "@/lib/fiscal/code128";
import {
  buildInfCplNfe,
  textoConsultaAutenticidadeNfe,
} from "@/lib/fiscal/textos";
import { formatBrl, formatQtde } from "@/lib/orcamento-comercial";
import { formatCep, formatDocumento } from "@/lib/parceiros";

const INK = "#111";
const MUTED = "#333";
const LINE = "#000";
const BOX_BG = "#f0f0f0";
const MARGIN = 12;
const PAGE_W = 595.28;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PAGE_BOTTOM = 830;

type PDF = PDFKit.PDFDocument;

export type DanfeDuplicata = {
  nDup: string;
  dVenc: Date;
  vDup: number;
};

export type DanfeTransporte = {
  /** 0–4 ou 9 (sem ocorrência). */
  modalidadeFrete?: number;
  nome?: string | null;
  cnpjCpf?: string | null;
  ie?: string | null;
  endereco?: string | null;
  municipio?: string | null;
  uf?: string | null;
  placa?: string | null;
  ufVeiculo?: string | null;
  rntc?: string | null;
  quantidade?: number | string | null;
  especie?: string | null;
  marca?: string | null;
  numeracao?: string | null;
  pesoBruto?: number | string | null;
  pesoLiquido?: number | string | null;
};

export type DanfeItem = {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  csosn?: string | null;
  origem?: number | null;
  infAdProd?: string | null;
  valorDesconto?: number;
  baseIcms?: number;
  valorIcms?: number;
  valorIpi?: number;
  aliqIcms?: number;
  aliqIpi?: number;
};

export type DanfeInput = {
  empresa: {
    nomeFantasia?: string | null;
    razaoSocial: string;
    cnpj: string;
    inscricaoEstadual?: string | null;
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
  destinatarioNome: string;
  destinatarioDoc?: string | null;
  destinatarioEndereco?: string | null;
  destinatarioBairro?: string | null;
  destinatarioCidade?: string | null;
  destinatarioUf?: string | null;
  destinatarioCep?: string | null;
  destinatarioIe?: string | null;
  destinatarioFone?: string | null;
  numero: string;
  serie: string;
  chave: string | null;
  valor: number;
  naturezaOperacao?: string;
  protocolo?: string | null;
  autorizadoEm?: Date | null;
  dataSaida?: Date | null;
  horaSaida?: string | null;
  pedidoNumero?: string | number | null;
  vencimento?: Date | null;
  duplicatas?: DanfeDuplicata[];
  transporte?: DanfeTransporte | null;
  itens: DanfeItem[];
  simulado: boolean;
  /** Texto livre p/ RESERVADO AO FISCO (infAdFisco). */
  infAdFisco?: string | null;
  /** Sobrescreve infCpl gerado. */
  informacoesComplementares?: string | null;
  folha?: string;
};

const MOD_FRETE: Record<number, string> = {
  0: "0-Emitente",
  1: "1-Destinatário",
  2: "2-Terceiros",
  3: "3-Próprio Remet.",
  4: "4-Próprio Dest.",
  9: "9-Sem Transporte",
};

function bufferFromPdf(doc: PDF): Promise<Buffer> {
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

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR");
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleString("pt-BR");
}

function formatChaveGrupos(chave: string | null | undefined): string {
  if (!chave) return "";
  const d = chave.replace(/\D/g, "");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatNfeNumero(n: string | number): string {
  const digits = String(n).replace(/\D/g, "").padStart(9, "0").slice(-9);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
}

function formatSerie(s: string | number): string {
  return String(s).replace(/\D/g, "").padStart(3, "0") || "001";
}

function box(doc: PDF, x: number, y: number, w: number, h: number, fill?: string) {
  doc.save();
  if (fill) doc.rect(x, y, w, h).fill(fill);
  doc.rect(x, y, w, h).strokeColor(LINE).lineWidth(0.7).stroke();
  doc.restore();
}

function label(doc: PDF, text: string, x: number, y: number, w?: number) {
  doc
    .fillColor(MUTED)
    .fontSize(5)
    .font("Helvetica")
    .text(text.toUpperCase(), x, y, { width: w, lineGap: 0 });
}

function cell(
  doc: PDF,
  title: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { valueSize?: number; bold?: boolean },
) {
  box(doc, x, y, w, h);
  label(doc, title, x + 2.5, y + 1.2, w - 5);
  doc
    .fillColor(INK)
    .fontSize(opts?.valueSize ?? 7)
    .font(opts?.bold ? "Helvetica-Bold" : "Helvetica")
    .text(value || " ", x + 2.5, y + 9, {
      width: w - 5,
      height: h - 11,
      lineGap: 0,
    });
}

function sectionTitle(doc: PDF, text: string, x: number, y: number) {
  doc.fillColor(INK).fontSize(6.5).font("Helvetica-Bold").text(text, x, y);
}

function ensureY(doc: PDF, y: number, need: number): number {
  if (y + need <= PAGE_BOTTOM) return y;
  doc.addPage();
  return MARGIN;
}

function enderecoEmitente(e: DanfeInput["empresa"]): string {
  const linha1 = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const linha2 = [e.bairro, e.cep ? formatCep(e.cep) : ""].filter(Boolean).join(" - ");
  const linha3 = [
    e.cidade && e.uf ? `${e.cidade} - ${e.uf}` : e.cidade || e.uf,
    e.telefone ? `Fone/Fax: ${e.telefone}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [linha1, linha2, linha3].filter(Boolean).join("\n");
}

function defaultDuplicatas(opts: DanfeInput): DanfeDuplicata[] {
  if (opts.duplicatas?.length) return opts.duplicatas;
  const venc =
    opts.vencimento ||
    new Date((opts.autorizadoEm || new Date()).getTime() + 28 * 86400000);
  return [{ nDup: "001", dVenc: venc, vDup: opts.valor }];
}

/** Renderiza DANFE A4 (retrato) no padrão dos modelos oficiais. */
export async function renderDanfe(opts: DanfeInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: {
      Title: `DANFE ${opts.numero}`,
      Author: opts.empresa.razaoSocial,
      Subject: "Documento Auxiliar da Nota Fiscal Eletrônica",
    },
  });
  const L = MARGIN;
  const W = CONTENT_W;
  let y = MARGIN;

  const chaveDigits = (opts.chave || "").replace(/\D/g, "");
  const nFmt = formatNfeNumero(opts.numero);
  const sFmt = formatSerie(opts.serie);
  const dups = defaultDuplicatas(opts);
  const transp: DanfeTransporte = {
    modalidadeFrete: 9,
    ...opts.transporte,
  };
  const freteLabel = MOD_FRETE[transp.modalidadeFrete ?? 9] || "9-Sem Transporte";
  const infCpl =
    opts.informacoesComplementares ||
    buildInfCplNfe({
      pedidoNumero: opts.pedidoNumero || opts.numero,
      valorNota: opts.valor,
      autorizadoEm: opts.autorizadoEm,
      // Homologação vai em RESERVADO AO FISCO (não duplicar no contribuinte).
      simulado: false,
    });
  const infFisco =
    opts.infAdFisco ||
    (opts.simulado
      ? "Homologação Focus NFe — documento simulado, sem valor fiscal."
      : "");

  // ── Canhoto ──────────────────────────────────────────────
  const canH = 46;
  box(doc, L, y, W * 0.78, canH);
  doc
    .fillColor(MUTED)
    .fontSize(5.5)
    .font("Helvetica")
    .text(
      `RECEBEMOS DE ${opts.empresa.razaoSocial.toUpperCase()} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO.`,
      L + 3,
      y + 3,
      { width: W * 0.78 - 6 },
    );
  doc
    .fillColor(INK)
    .fontSize(6.5)
    .text(
      `EMISSÃO: ${fmtDate(opts.autorizadoEm)}   VALOR TOTAL: ${formatBrl(opts.valor)}   DESTINATÁRIO: ${opts.destinatarioNome}`,
      L + 3,
      y + 18,
      { width: W * 0.78 - 6 },
    );
  doc
    .strokeColor(LINE)
    .lineWidth(0.5)
    .moveTo(L, y + 28)
    .lineTo(L + W * 0.78, y + 28)
    .stroke();
  label(doc, "Data de recebimento", L + 3, y + 30, 90);
  label(doc, "Identificação e assinatura do recebedor", L + 100, y + 30, 200);
  box(doc, L + W * 0.78, y, W * 0.22, canH);
  doc
    .fillColor(INK)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("NF-e", L + W * 0.78 + 6, y + 6);
  doc.fontSize(8).font("Helvetica").text(`Nº. ${nFmt}`, L + W * 0.78 + 6, y + 22);
  doc.text(`Série ${sFmt}`, L + W * 0.78 + 6, y + 34);
  y += canH + 4;

  // Linha tracejada de corte
  doc
    .save()
    .dash(2, { space: 2 })
    .strokeColor("#666")
    .lineWidth(0.5)
    .moveTo(L, y)
    .lineTo(L + W, y)
    .stroke()
    .undash()
    .restore();
  y += 4;

  // ── Cabeçalho: Emitente | DANFE | Chave + Código de barras ──
  const headH = 92;
  const emitW = W * 0.42;
  const danfeW = W * 0.18;
  const chaveW = W * 0.4;

  box(doc, L, y, emitW, headH);
  label(doc, "Identificação do Emitente", L + 3, y + 2);
  const logo = resolveLogoPath();
  let emitTextY = y + 12;
  if (logo) {
    try {
      doc.image(logo, L + 4, y + 12, { height: 22 });
      emitTextY = y + 36;
    } catch {
      /* ignore */
    }
  }
  doc
    .fillColor(INK)
    .fontSize(7.5)
    .font("Helvetica-Bold")
    .text(opts.empresa.razaoSocial, L + 4, emitTextY, { width: emitW - 8 });
  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor(MUTED)
    .text(enderecoEmitente(opts.empresa), L + 4, emitTextY + 11, {
      width: emitW - 8,
      lineGap: 1,
    });

  box(doc, L + emitW, y, danfeW, headH);
  doc
    .fillColor(INK)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("DANFE", L + emitW + 4, y + 6, { width: danfeW - 8, align: "center" });
  doc
    .fontSize(5.5)
    .font("Helvetica")
    .text("Documento Auxiliar da Nota Fiscal Eletrônica", L + emitW + 4, y + 20, {
      width: danfeW - 8,
      align: "center",
    });
  doc.fontSize(7).text("0 - ENTRADA", L + emitW + 8, y + 42);
  doc.font("Helvetica-Bold").text("1 - SAÍDA          1", L + emitW + 8, y + 54);
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .text(`Nº. ${nFmt}`, L + emitW + 4, y + 68, { width: danfeW - 8, align: "center" });
  doc.text(`Série ${sFmt}`, L + emitW + 4, y + 78, { width: danfeW - 8, align: "center" });

  box(doc, L + emitW + danfeW, y, chaveW, headH);
  label(doc, "Chave de Acesso", L + emitW + danfeW + 4, y + 2, chaveW - 8);
  if (chaveDigits.length === 44) {
    try {
      drawCode128C(doc, chaveDigits, L + emitW + danfeW + 6, y + 12, chaveW - 12, 22);
    } catch {
      /* ignore */
    }
  } else {
    doc
      .fillColor(MUTED)
      .fontSize(7)
      .font("Helvetica")
      .text("(chave indisponível)", L + emitW + danfeW + 6, y + 18);
  }
  doc
    .fillColor(INK)
    .fontSize(7)
    .font("Helvetica-Bold")
    .text(formatChaveGrupos(chaveDigits) || "—", L + emitW + danfeW + 4, y + 38, {
      width: chaveW - 8,
      align: "center",
    });
  doc
    .fillColor(MUTED)
    .fontSize(5.5)
    .font("Helvetica")
    .text(textoConsultaAutenticidadeNfe(), L + emitW + danfeW + 4, y + 54, {
      width: chaveW - 8,
      align: "center",
      lineGap: 1,
    });
  if (opts.simulado) {
    doc
      .fillColor("#8a5a00")
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("AMBIENTE DE HOMOLOGAÇÃO", L + emitW + danfeW + 4, y + 80, {
        width: chaveW - 8,
        align: "center",
      });
  }
  y += headH;

  // Natureza + Protocolo
  cell(
    doc,
    "Natureza da Operação",
    opts.naturezaOperacao || "VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS",
    L,
    y,
    W * 0.58,
    20,
  );
  cell(
    doc,
    "Protocolo de Autorização de Uso",
    opts.protocolo
      ? `${opts.protocolo} - ${fmtDateTime(opts.autorizadoEm)}`
      : opts.simulado
        ? `SIMULADO - ${fmtDateTime(opts.autorizadoEm)}`
        : "—",
    L + W * 0.58,
    y,
    W * 0.42,
    20,
  );
  y += 20;

  cell(doc, "Inscrição Estadual", opts.empresa.inscricaoEstadual || "ISENTO", L, y, W * 0.34, 18);
  cell(doc, "Inscr. Est. do Subst. Tributário", " ", L + W * 0.34, y, W * 0.33, 18);
  cell(doc, "CNPJ", formatDocumento(opts.empresa.cnpj), L + W * 0.67, y, W * 0.33, 18);
  y += 20;

  // ── DESTINATÁRIO / REMETENTE ──
  sectionTitle(doc, "DESTINATÁRIO / REMETENTE", L, y);
  y += 8;
  cell(doc, "Nome / Razão Social", opts.destinatarioNome, L, y, W * 0.58, 18);
  cell(
    doc,
    "CNPJ / CPF",
    opts.destinatarioDoc ? formatDocumento(opts.destinatarioDoc) : " ",
    L + W * 0.58,
    y,
    W * 0.24,
    18,
  );
  cell(doc, "Data da Emissão", fmtDate(opts.autorizadoEm), L + W * 0.82, y, W * 0.18, 18);
  y += 18;
  cell(doc, "Endereço", opts.destinatarioEndereco || " ", L, y, W * 0.48, 18);
  cell(doc, "Bairro / Distrito", opts.destinatarioBairro || " ", L + W * 0.48, y, W * 0.22, 18);
  cell(
    doc,
    "CEP",
    opts.destinatarioCep ? formatCep(opts.destinatarioCep) : " ",
    L + W * 0.7,
    y,
    W * 0.14,
    18,
  );
  cell(
    doc,
    "Data da Saída/Entrada",
    fmtDate(opts.dataSaida),
    L + W * 0.84,
    y,
    W * 0.16,
    18,
  );
  y += 18;
  cell(doc, "Município", opts.destinatarioCidade || " ", L, y, W * 0.38, 18);
  cell(doc, "UF", opts.destinatarioUf || " ", L + W * 0.38, y, W * 0.08, 18);
  cell(doc, "Fone / Fax", opts.destinatarioFone || " ", L + W * 0.46, y, W * 0.18, 18);
  cell(doc, "Inscrição Estadual", opts.destinatarioIe || " ", L + W * 0.64, y, W * 0.2, 18);
  cell(
    doc,
    "Hora da Saída/Entrada",
    opts.horaSaida || " ",
    L + W * 0.84,
    y,
    W * 0.16,
    18,
  );
  y += 20;

  // ── FATURA / DUPLICATA ──
  sectionTitle(doc, "FATURA / DUPLICATA", L, y);
  y += 8;
  const faturaH = 28;
  box(doc, L, y, W, faturaH);
  const dupSlot = Math.min(dups.length, 4);
  const dupW = W / Math.max(dupSlot, 1);
  for (let i = 0; i < dupSlot; i++) {
    const d = dups[i];
    const x = L + i * dupW;
    if (i > 0) {
      doc
        .strokeColor(LINE)
        .lineWidth(0.5)
        .moveTo(x, y)
        .lineTo(x, y + faturaH)
        .stroke();
    }
    doc
      .fillColor(INK)
      .fontSize(6.5)
      .font("Helvetica")
      .text(`Num. ${d.nDup}`, x + 4, y + 3, { width: dupW - 8 });
    doc.text(`Venc. ${fmtDate(d.dVenc)}`, x + 4, y + 12, { width: dupW - 8 });
    doc
      .font("Helvetica-Bold")
      .text(`Valor ${formatBrl(d.vDup)}`, x + 4, y + 20, { width: dupW - 8 });
  }
  y += faturaH + 4;

  // ── CÁLCULO DO IMPOSTO ──
  sectionTitle(doc, "CÁLCULO DO IMPOSTO", L, y);
  y += 8;
  const tw = W / 9;
  cell(doc, "Base de Cálc. do ICMS", "0,00", L, y, tw, 18);
  cell(doc, "Valor do ICMS", "0,00", L + tw, y, tw, 18);
  cell(doc, "Base de Cálc. ICMS S.T.", "0,00", L + tw * 2, y, tw, 18);
  cell(doc, "Valor do ICMS Subst.", "0,00", L + tw * 3, y, tw, 18);
  cell(doc, "V. Imp. Importação", "0,00", L + tw * 4, y, tw, 18);
  cell(doc, "V. ICMS UF Remet.", "0,00", L + tw * 5, y, tw, 18);
  cell(doc, "V. FCP UF Dest.", "0,00", L + tw * 6, y, tw, 18);
  cell(doc, "Valor do PIS", "0,00", L + tw * 7, y, tw, 18);
  cell(
    doc,
    "V. Total Produtos",
    formatBrl(opts.valor),
    L + tw * 8,
    y,
    tw,
    18,
    { bold: true },
  );
  y += 18;
  cell(doc, "Valor do Frete", "0,00", L, y, tw, 18);
  cell(doc, "Valor do Seguro", "0,00", L + tw, y, tw, 18);
  cell(doc, "Desconto", "0,00", L + tw * 2, y, tw, 18);
  cell(doc, "Outras Despesas", "0,00", L + tw * 3, y, tw, 18);
  cell(doc, "Valor Total IPI", "0,00", L + tw * 4, y, tw, 18);
  cell(doc, "V. ICMS UF Dest.", "0,00", L + tw * 5, y, tw, 18);
  cell(doc, "V. Tot. Tributos", "0,00", L + tw * 6, y, tw, 18);
  cell(doc, "Valor da COFINS", "0,00", L + tw * 7, y, tw, 18);
  cell(
    doc,
    "V. Total da Nota",
    formatBrl(opts.valor),
    L + tw * 8,
    y,
    tw,
    18,
    { bold: true },
  );
  y += 20;

  // ── TRANSPORTADOR / VOLUMES TRANSPORTADOS ──
  sectionTitle(doc, "TRANSPORTADOR / VOLUMES TRANSPORTADOS", L, y);
  y += 8;
  cell(doc, "Nome / Razão Social", transp.nome || " ", L, y, W * 0.4, 18);
  cell(doc, "Frete", freteLabel, L + W * 0.4, y, W * 0.16, 18);
  cell(doc, "Código ANTT", transp.rntc || " ", L + W * 0.56, y, W * 0.12, 18);
  cell(doc, "Placa do Veículo", transp.placa || " ", L + W * 0.68, y, W * 0.12, 18);
  cell(doc, "UF", transp.ufVeiculo || " ", L + W * 0.8, y, W * 0.06, 18);
  cell(
    doc,
    "CNPJ / CPF",
    transp.cnpjCpf ? formatDocumento(transp.cnpjCpf) : " ",
    L + W * 0.86,
    y,
    W * 0.14,
    18,
  );
  y += 18;
  cell(doc, "Endereço", transp.endereco || " ", L, y, W * 0.5, 18);
  cell(doc, "Município", transp.municipio || " ", L + W * 0.5, y, W * 0.28, 18);
  cell(doc, "UF", transp.uf || " ", L + W * 0.78, y, W * 0.06, 18);
  cell(doc, "Inscrição Estadual", transp.ie || " ", L + W * 0.84, y, W * 0.16, 18);
  y += 18;
  cell(
    doc,
    "Quantidade",
    transp.quantidade != null && transp.quantidade !== ""
      ? String(transp.quantidade)
      : " ",
    L,
    y,
    W / 6,
    18,
  );
  cell(doc, "Espécie", transp.especie || " ", L + W / 6, y, W / 6, 18);
  cell(doc, "Marca", transp.marca || " ", L + (W * 2) / 6, y, W / 6, 18);
  cell(doc, "Numeração", transp.numeracao || " ", L + (W * 3) / 6, y, W / 6, 18);
  cell(
    doc,
    "Peso Bruto",
    transp.pesoBruto != null && transp.pesoBruto !== ""
      ? String(transp.pesoBruto)
      : " ",
    L + (W * 4) / 6,
    y,
    W / 6,
    18,
  );
  cell(
    doc,
    "Peso Líquido",
    transp.pesoLiquido != null && transp.pesoLiquido !== ""
      ? String(transp.pesoLiquido)
      : " ",
    L + (W * 5) / 6,
    y,
    W / 6,
    18,
  );
  y += 20;

  // ── DADOS DOS PRODUTOS / SERVIÇOS ──
  sectionTitle(doc, "DADOS DOS PRODUTOS / SERVIÇOS", L, y);
  y += 8;
  const colDefs: Array<{ t: string; x: number; w: number; align?: "left" | "right" }> = [
    { t: "CÓDIGO", x: L + 1, w: 32 },
    { t: "DESCRIÇÃO DO PRODUTO / SERVIÇO", x: L + 34, w: 148 },
    { t: "NCM/SH", x: L + 184, w: 36 },
    { t: "O/CSOSN", x: L + 222, w: 28 },
    { t: "CFOP", x: L + 252, w: 24 },
    { t: "UN", x: L + 278, w: 16 },
    { t: "QUANT.", x: L + 296, w: 40, align: "right" },
    { t: "V.UNIT.", x: L + 338, w: 42, align: "right" },
    { t: "V.TOTAL", x: L + 382, w: 42, align: "right" },
    { t: "BC ICMS", x: L + 426, w: 34, align: "right" },
    { t: "V.ICMS", x: L + 462, w: 32, align: "right" },
    { t: "V.IPI", x: L + 496, w: 28, align: "right" },
    { t: "ALIQ", x: L + 526, w: 30, align: "right" },
  ];
  const headerH = 16;
  box(doc, L, y, W, headerH, BOX_BG);
  doc.fillColor(MUTED).fontSize(5).font("Helvetica-Bold");
  for (const c of colDefs) {
    doc.text(c.t, c.x, y + 4, { width: c.w, align: c.align || "left" });
  }
  y += headerH;

  for (const it of opts.itens) {
    const descLines = [it.descricao];
    if (it.infAdProd && it.infAdProd !== it.descricao) descLines.push(it.infAdProd);
    const descText = descLines.join("\n");
    doc.font("Helvetica").fontSize(6);
    const descH = Math.max(
      14,
      Math.min(40, doc.heightOfString(descText, { width: 146, lineGap: 0 }) + 4),
    );
    y = ensureY(doc, y, descH + 2);
    box(doc, L, y, W, descH);
    doc.fillColor(INK).fontSize(6).font("Helvetica");
    const orig = it.origem ?? 0;
    const csosn = it.csosn || "102";
    doc.text(it.codigo, L + 1, y + 2, { width: 32 });
    doc.text(descText, L + 34, y + 2, { width: 146, height: descH - 3, lineGap: 0 });
    doc.text(it.ncm, L + 184, y + 2, { width: 36 });
    doc.text(`${orig}/${csosn}`, L + 222, y + 2, { width: 28 });
    doc.text(it.cfop, L + 252, y + 2, { width: 24 });
    doc.text(it.unidade, L + 278, y + 2, { width: 16 });
    doc.text(formatQtde(it.quantidade), L + 296, y + 2, { width: 40, align: "right" });
    doc.text(
      it.valorUnitario.toLocaleString("pt-BR", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 10,
      }),
      L + 338,
      y + 2,
      { width: 42, align: "right" },
    );
    doc.text(formatBrl(it.valorTotal), L + 382, y + 2, { width: 42, align: "right" });
    doc.text(formatBrl(it.baseIcms ?? 0), L + 426, y + 2, { width: 34, align: "right" });
    doc.text(formatBrl(it.valorIcms ?? 0), L + 462, y + 2, { width: 32, align: "right" });
    doc.text(formatBrl(it.valorIpi ?? 0), L + 496, y + 2, { width: 28, align: "right" });
    doc.text(
      `${(it.aliqIcms ?? 0).toFixed(0)}/${(it.aliqIpi ?? 0).toFixed(0)}`,
      L + 526,
      y + 2,
      { width: 30, align: "right" },
    );
    y += descH;
  }
  y += 4;

  // ── DADOS ADICIONAIS ──
  y = ensureY(doc, y, 70);
  sectionTitle(doc, "DADOS ADICIONAIS", L, y);
  y += 8;
  const addH = Math.max(56, Math.min(90, doc.heightOfString(infCpl, { width: W * 0.62 - 8 }) + 18));
  const cplW = W * 0.62;
  const fiscoW = W * 0.38;
  box(doc, L, y, cplW, addH);
  label(doc, "Informações Complementares", L + 3, y + 2);
  doc
    .fillColor(INK)
    .fontSize(6)
    .font("Helvetica")
    .text(`Inf. Contribuinte: ${infCpl}`, L + 3, y + 11, {
      width: cplW - 6,
      height: addH - 14,
      lineGap: 1,
    });
  box(doc, L + cplW, y, fiscoW, addH);
  label(doc, "Reservado ao Fisco", L + cplW + 3, y + 2);
  doc
    .fillColor(MUTED)
    .fontSize(6)
    .font("Helvetica")
    .text(infFisco || " ", L + cplW + 3, y + 11, {
      width: fiscoW - 6,
      height: addH - 14,
    });
  y += addH + 6;

  doc
    .fillColor(MUTED)
    .fontSize(5.5)
    .font("Helvetica")
    .text(
      `Impresso em ${fmtDateTime(new Date())} · Folha ${opts.folha || "1/1"} · Focus NFe / ERP Reta`,
      L,
      Math.min(y, PAGE_BOTTOM),
      { width: W, align: "center" },
    );

  return bufferFromPdf(doc);
}
