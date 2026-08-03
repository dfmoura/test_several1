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

/** A4 landscape — densidade típica de proposta comercial ERP (sem folga ociosa). */
const PAGE = { width: 841.89, height: 595.28 };
const MARGIN = { top: 26, right: 28, bottom: 24, left: 28 };

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
  doc.save().strokeColor(LINE).lineWidth(0.7).moveTo(x0, y).lineTo(x1, y).stroke().restore();
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
    /** Reserva mínima para rodapé — evita quebrar página por folga excessiva. */
    const footerReserve = 22;
    const contHeaderH = 22;
    let y = MARGIN.top;
    let pageNum = 1;

    const pageBottom = () => PAGE.height - MARGIN.bottom - footerReserve;

    const ensureSpace = (need: number) => {
      if (y + need <= pageBottom()) return;
      drawFooter(doc, data, left, right, contentW, pageNum);
      doc.addPage();
      pageNum += 1;
      y = MARGIN.top;
      drawContinuationHeader(doc, data, left, right, contentW);
      y = MARGIN.top + contHeaderH;
    };

    // —— Header brand ——
    const logoPath = resolveLogoPath();
    const logoH = 34;
    if (logoPath) {
      try {
        doc.image(logoPath, left, y, { height: logoH });
      } catch {
        /* logo opcional */
      }
    }

    const brandX = left + (logoPath ? 100 : 0);
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(data.empresa?.nomeFantasia || "Reta Etiquetas", brandX, y, {
        width: 300,
      });
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7.5)
      .text(data.empresa?.razaoSocial || "", brandX, y + 15, { width: 300 });

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
      doc.text(contact, brandX, y + 26, { width: 340 });
    }

    const metaW = 200;
    const metaX = right - metaW;
    const metaH = 44;
    doc.roundedRect(metaX, y, metaW, metaH, 3).fillAndStroke("#eef5f1", LINE);
    doc
      .fillColor(ACCENT)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("PROPOSTA COMERCIAL", metaX + 10, y + 6, { width: metaW - 20 });
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(`Nº ${data.numero} — v${data.versao}`, metaX + 10, y + 18, {
        width: metaW - 20,
      });
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        `${data.data.toLocaleDateString("pt-BR")}  ·  ${STATUS_LABEL[data.status]}`,
        metaX + 10,
        y + 32,
        { width: metaW - 20 },
      );

    y += Math.max(logoH, metaH) + 8;
    drawHLine(doc, y, left, right);
    y += 10;

    // —— Parties ——
    const colW = (contentW - 12) / 2;
    doc.fillColor(MUTED).font("Helvetica").fontSize(7).text("CLIENTE", left, y);
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(data.clienteNome, left, y + 10, { width: colW });

    doc.fillColor(MUTED).font("Helvetica").fontSize(7).text("VENDEDOR", left + colW + 12, y);
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(data.vendedorNome, left + colW + 12, y + 10, { width: colW });

    y += 28;
    doc.fillColor(MUTED).font("Helvetica").fontSize(7).text("ESPECIFICAÇÃO", left, y);
    doc
      .fillColor(INK)
      .font("Helvetica")
      .fontSize(9)
      .text(descricaoProduto(data.input) || "—", left, y + 10, { width: contentW });

    const specs: Array<[string, string]> = [
      ["Cores", String(data.input.cores ?? "—")],
      ["Tubete", String(data.input.tubete ?? "—")],
      ["Colunas", String(data.input.qtdeColunas ?? "—")],
      ["Modelos", String(data.input.qtdeModelos ?? "—")],
      ["Matriz", data.input.matriz ? "Sim (1º pedido)" : "Não"],
      ["Formato", String(data.input.formatoFaca || data.input.medida || "—")],
    ];
    y += 26;
    const chipW = contentW / specs.length;
    specs.forEach(([label, value], i) => {
      const x = left + i * chipW;
      doc.fillColor(MUTED).font("Helvetica").fontSize(6.5).text(label.toUpperCase(), x, y);
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(8.5).text(value, x, y + 9, {
        width: chipW - 6,
      });
    });

    y += 26;
    drawHLine(doc, y, left, right);
    y += 8;

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
      doc.rect(left, y, contentW, 18).fill(HEADER_BG);
      let cx = left;
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
      for (const c of cols) {
        doc.text(c.label, cx + 5, y + 5, { width: c.w - 10 });
        cx += c.w;
      }
      y += 18;
    };

    drawTableHeader();

    if (faixas.length === 0) {
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(9)
        .text("Sem faixas calculadas neste orçamento.", left, y + 6);
      y += 24;
    } else {
      faixas.forEach((f, idx) => {
        const rowH = 18;
        ensureSpace(rowH + 4);
        if (y === MARGIN.top + contHeaderH) {
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
            .fontSize(8.5)
            .text(val, cx + 5, y + 5, { width: cols[i].w - 10 });
          cx += cols[i].w;
        });
        y += rowH;
      });
    }

    y += 6;
    ensureSpace(28);
    drawHLine(doc, y, left, right);
    y += 8;

    if (data.observacoes?.trim()) {
      const obsH = Math.min(
        48,
        doc.heightOfString(data.observacoes.trim(), { width: contentW * 0.72 }) + 18,
      );
      ensureSpace(obsH);
      doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(8).text("OBSERVAÇÕES", left, y);
      y += 10;
      doc
        .fillColor(MUTED)
        .font("Helvetica")
        .fontSize(7.5)
        .text(data.observacoes.trim(), left, y, { width: contentW * 0.72 });
      y += Math.max(14, doc.heightOfString(data.observacoes.trim(), { width: contentW * 0.72 }) + 4);
    }

    const terms = [
      `Prazo de entrega: ${data.comercial.prazoEntrega}`,
      `Validade da proposta: ${data.comercial.validade}`,
      data.comercial.clausulaQuantidade,
      data.input.matriz ? "Valor da matriz cobrado somente no 1º pedido." : null,
      "Preços em reais (BRL). Impostos e condições comerciais conforme proposta.",
    ].filter(Boolean) as string[];

    const termsBlockH = 12 + terms.length * 10;
    const sigH = 40;
    ensureSpace(termsBlockH + sigH + 8);
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(8).text("CONDIÇÕES", left, y);
    y += 10;
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5);
    for (const t of terms) {
      doc.text(`•  ${t}`, left, y, { width: contentW * 0.7 });
      y += 10;
    }

    // Aceite imediatamente após condições (não empurra para o rodapé da página).
    y += 6;
    const sigY = y;
    doc
      .roundedRect(left, sigY, contentW, sigH, 3)
      .strokeColor(LINE)
      .lineWidth(0.8)
      .stroke();
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7)
      .text("ACEITE DO CLIENTE", left + 10, sigY + 5);
    doc
      .fillColor(INK)
      .fontSize(8)
      .text("Nome: ________________________________", left + 10, sigY + 20);
    doc.text("Assinatura: ____________________________", left + 250, sigY + 20);
    doc.text("Data: ____ / ____ / ________", left + 500, sigY + 20);

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
    .fontSize(7.5)
    .text(
      `Proposta ${data.numero}-v${data.versao} · ${data.clienteNome} · continuação`,
      left,
      MARGIN.top,
      { width: contentW },
    );
  drawHLine(doc, MARGIN.top + 12, left, right);
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  data: PdfOrcamentoData,
  left: number,
  _right: number,
  contentW: number,
  pageNum: number,
) {
  const fy = PAGE.height - MARGIN.bottom + 2;
  if (data.empresa) {
    const addr = empresaEndereco(data.empresa).replace(/\n/g, "  ·  ");
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(6.5)
      .text(addr, left, fy, {
        width: contentW - 28,
        align: "center",
      });
  }
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(6.5)
    .text(String(pageNum), left + contentW - 20, fy, {
      width: 20,
      align: "right",
    });
}
