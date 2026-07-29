import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Empresa } from "@prisma/client";
import {
  descricaoProduto,
  formatBrl,
  formatQtde,
  type ComercialParams,
  type OrcamentoInputSnapshot,
  type OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";
import { formatDocumento, formatCep } from "@/lib/parceiros";
import { STATUS_LABEL } from "@/lib/orcamento-status";
import type { OrcamentoStatus } from "@prisma/client";

const PAGE = { width: 841.89, height: 595.28 }; // A4 landscape
const MARGIN = { top: 36, right: 40, bottom: 36, left: 40 };

const INK = "#1a2e24";
const MUTED = "#5a7266";
const ACCENT = "#2d6b4f";
const LINE = "#d5e0da";
const ROW_ALT = "#f4f8f6";
const HEADER_BG = "#1f3d30";

export type PdfOrcamentoData = {
  numero: number;
  versao: number;
  status: OrcamentoStatus;
  data: Date;
  clienteNome: string;
  vendedorNome: string;
  observacoes?: string | null;
  input: OrcamentoInputSnapshot;
  result: OrcamentoResultSnapshot | null;
  comercial: ComercialParams;
  empresa: Pick<
    Empresa,
    | "nomeFantasia"
    | "razaoSocial"
    | "cnpj"
    | "inscricaoEstadual"
    | "email"
    | "telefone"
    | "celular"
    | "website"
    | "cep"
    | "logradouro"
    | "numero"
    | "complemento"
    | "bairro"
    | "cidade"
    | "uf"
  > | null;
};

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

function empresaEndereco(
  e: NonNullable<PdfOrcamentoData["empresa"]>,
): string {
  const line1 = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(", ");
  const line2 = [e.bairro, e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade || e.uf]
    .filter(Boolean)
    .join(" · ");
  const cep = e.cep ? `CEP ${formatCep(e.cep)}` : "";
  return [line1, line2, cep].filter(Boolean).join("\n");
}

function drawHLine(doc: PDFKit.PDFDocument, y: number, x0: number, x1: number) {
  doc.save().strokeColor(LINE).lineWidth(0.8).moveTo(x0, y).lineTo(x1, y).stroke().restore();
}

export async function buildOrcamentoPdf(data: PdfOrcamentoData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: MARGIN,
      info: {
        Title: `Proposta comercial ${data.numero}-v${data.versao}`,
        Author: data.empresa?.nomeFantasia || "Reta Etiquetas",
        Subject: `Orçamento para ${data.clienteNome}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentW = PAGE.width - MARGIN.left - MARGIN.right;
    const left = MARGIN.left;
    const right = PAGE.width - MARGIN.right;
    const footerReserve = 70;
    let y = MARGIN.top;
    let pageNum = 1;

    const ensureSpace = (need: number) => {
      if (y + need <= PAGE.height - MARGIN.bottom - footerReserve) return;
      drawFooter(doc, data, left, right, contentW, pageNum);
      doc.addPage();
      pageNum += 1;
      y = MARGIN.top;
      drawContinuationHeader(doc, data, left, right, contentW);
      y = MARGIN.top + 36;
    };

    // —— Header brand ——
    const logoPath = resolveLogoPath();
    const logoH = 42;
    if (logoPath) {
      try {
        doc.image(logoPath, left, y, { height: logoH });
      } catch {
        /* logo opcional */
      }
    }

    const brandX = left + (logoPath ? 118 : 0);
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(data.empresa?.nomeFantasia || "Reta Etiquetas", brandX, y + 2, {
        width: 280,
      });
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text(data.empresa?.razaoSocial || "", brandX, y + 20, { width: 280 });

    if (data.empresa) {
      const contact = [
        data.empresa.cnpj ? `CNPJ ${formatDocumento(data.empresa.cnpj)}` : null,
        data.empresa.inscricaoEstadual ? `IE ${data.empresa.inscricaoEstadual}` : null,
        data.empresa.telefone || data.empresa.celular,
        data.empresa.email,
        data.empresa.website,
      ]
        .filter(Boolean)
        .join("  ·  ");
      doc.text(contact, brandX, y + 32, { width: 320 });
    }

    // Right meta block
    const metaW = 220;
    const metaX = right - metaW;
    doc
      .roundedRect(metaX, y, metaW, 54, 4)
      .fillAndStroke("#eef5f1", LINE);
    doc
      .fillColor(ACCENT)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("PROPOSTA COMERCIAL", metaX + 12, y + 8, { width: metaW - 24 });
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(`Nº ${data.numero} — v${data.versao}`, metaX + 12, y + 24, {
        width: metaW - 24,
      });
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `${data.data.toLocaleDateString("pt-BR")}  ·  ${STATUS_LABEL[data.status]}`,
        metaX + 12,
        y + 40,
        { width: metaW - 24 },
      );

    y += 68;
    drawHLine(doc, y, left, right);
    y += 14;

    // —— Parties ——
    const colW = (contentW - 16) / 2;
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("CLIENTE", left, y);
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(data.clienteNome, left, y + 12, { width: colW });

    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("VENDEDOR", left + colW + 16, y);
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(data.vendedorNome, left + colW + 16, y + 12, { width: colW });

    y += 36;
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("ESPECIFICAÇÃO", left, y);
    doc
      .fillColor(INK)
      .font("Helvetica")
      .fontSize(10)
      .text(descricaoProduto(data.input) || "—", left, y + 12, { width: contentW });

    const specs: Array<[string, string]> = [
      ["Cores", String(data.input.cores ?? "—")],
      ["Tubete", String(data.input.tubete ?? "—")],
      ["Colunas", String(data.input.qtdeColunas ?? "—")],
      ["Modelos", String(data.input.qtdeModelos ?? "—")],
      ["Matriz", data.input.matriz ? "Sim (1º pedido)" : "Não"],
      ["Formato", String(data.input.formatoFaca || data.input.medida || "—")],
    ];
    y += 32;
    const chipW = contentW / specs.length;
    specs.forEach(([label, value], i) => {
      const x = left + i * chipW;
      doc.fillColor(MUTED).font("Helvetica").fontSize(7).text(label.toUpperCase(), x, y);
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(9).text(value, x, y + 10, {
        width: chipW - 8,
      });
    });

    y += 36;
    drawHLine(doc, y, left, right);
    y += 12;

    // —— Table ——
    const faixas = data.result?.faixas || [];
    const cols = [
      { key: "qtde", label: "Etiquetas", w: 90 },
      { key: "rolos", label: "Rolos", w: 70 },
      { key: "total", label: "Total (R$)", w: 120 },
      { key: "unit", label: "Unitário", w: 100 },
      { key: "rolo", label: "Valor / rolo", w: 100 },
      { key: "matriz", label: "Matriz", w: 100 },
      { key: "geral", label: "Total c/ matriz", w: contentW - 580 },
    ] as const;

    const drawTableHeader = () => {
      doc.rect(left, y, contentW, 22).fill(HEADER_BG);
      let cx = left;
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
      for (const c of cols) {
        doc.text(c.label, cx + 6, y + 7, { width: c.w - 12 });
        cx += c.w;
      }
      y += 22;
    };

    drawTableHeader();

    if (faixas.length === 0) {
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(10)
        .text("Sem faixas calculadas neste orçamento.", left, y + 10);
      y += 36;
    } else {
      faixas.forEach((f, idx) => {
        const rowH = 24;
        ensureSpace(rowH + 8);
        // Re-draw header if we just started a new page near table
        if (y === MARGIN.top + 36) {
          drawTableHeader();
        }
        if (idx % 2 === 1) {
          doc.rect(left, y, contentW, rowH).fill(ROW_ALT);
        }
        const q = f.production.quantidade;
        const rolos = f.production.qtdeRolos || 1;
        const valores = [
          formatQtde(q),
          formatQtde(rolos),
          formatBrl(f.commercial.valorEtiqueta),
          formatBrl(f.commercial.valorEtiqueta / q),
          formatBrl(f.commercial.valorEtiqueta / rolos),
          formatBrl(f.commercial.valorMatriz),
          formatBrl(f.commercial.valorTotal),
        ];
        let cx = left;
        valores.forEach((val, i) => {
          const isLast = i === valores.length - 1;
          doc
            .fillColor(INK)
            .font(isLast ? "Helvetica-Bold" : "Helvetica")
            .fontSize(9)
            .text(val, cx + 6, y + 7, { width: cols[i].w - 12 });
          cx += cols[i].w;
        });
        y += rowH;
      });
    }

    y += 10;
    ensureSpace(40);
    drawHLine(doc, y, left, right);
    y += 14;

    if (data.observacoes?.trim()) {
      ensureSpace(40);
      doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9).text("OBSERVAÇÕES", left, y);
      y += 12;
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(8)
        .text(data.observacoes.trim(), left, y, { width: contentW * 0.7 });
      y += 22;
    }

    // —— Terms ——
    const terms = [
      `Prazo de entrega: ${data.comercial.prazoEntrega}`,
      `Validade da proposta: ${data.comercial.validade}`,
      data.comercial.clausulaQuantidade,
      data.input.matriz
        ? "Valor da matriz cobrado somente no 1º pedido."
        : null,
      "Preços em reais (BRL). Impostos e condições comerciais conforme proposta.",
    ].filter(Boolean) as string[];

    ensureSpace(14 + terms.length * 12 + 60);
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9).text("CONDIÇÕES", left, y);
    y += 14;
    doc.fillColor(MUTED).font("Helvetica").fontSize(8);
    for (const t of terms) {
      doc.text(`•  ${t}`, left, y, { width: contentW * 0.62 });
      y += 12;
    }

    // Signature / acceptance strip
    ensureSpace(58);
    const sigY = Math.max(y + 10, PAGE.height - MARGIN.bottom - 58);
    doc
      .roundedRect(left, sigY, contentW, 48, 4)
      .strokeColor(LINE)
      .lineWidth(0.9)
      .stroke();
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text("ACEITE DO CLIENTE", left + 12, sigY + 8);
    doc
      .fillColor(INK)
      .fontSize(9)
      .text("Nome: ________________________________", left + 12, sigY + 24);
    doc.text("Assinatura: ____________________________", left + 260, sigY + 24);
    doc.text("Data: ____ / ____ / ________", left + 520, sigY + 24);

    drawFooter(doc, data, left, right, contentW, pageNum);
    doc.end();
  });
}

function drawContinuationHeader(
  doc: PDFKit.PDFDocument,
  data: PdfOrcamentoData,
  left: number,
  right: number,
  contentW: number,
) {
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text(
      `Proposta ${data.numero}-v${data.versao} · ${data.clienteNome} · continuação`,
      left,
      MARGIN.top,
      { width: contentW },
    );
  drawHLine(doc, MARGIN.top + 16, left, right);
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  data: PdfOrcamentoData,
  left: number,
  _right: number,
  contentW: number,
  pageNum: number,
) {
  if (data.empresa) {
    const addr = empresaEndereco(data.empresa).replace(/\n/g, "  ·  ");
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7)
      .text(addr, left, PAGE.height - MARGIN.bottom + 4, {
        width: contentW - 40,
        align: "center",
      });
  }
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(7)
    .text(String(pageNum), left + contentW - 20, PAGE.height - MARGIN.bottom + 4, {
      width: 20,
      align: "right",
    });
}
