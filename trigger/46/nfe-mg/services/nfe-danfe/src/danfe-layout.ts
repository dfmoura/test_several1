import type PDFDocument from 'pdfkit';

export const PT = 2.834645669;
export const PAGE_W = 595.28;
export const PAGE_H = 841.89;

/** Margem oficial aproximada (~7 mm) */
export const M = 7 * PT;
export const X = M;
export const W = PAGE_W - 2 * M;

export type Doc = InstanceType<typeof PDFDocument>;

export function mm(n: number): number {
  return n * PT;
}

export function box(doc: Doc, x: number, y: number, w: number, h: number): void {
  doc.lineWidth(0.6).rect(x, y, w, h).stroke('#000000');
}

export function vline(doc: Doc, x: number, y: number, h: number): void {
  doc.lineWidth(0.6).moveTo(x, y).lineTo(x, y + h).stroke('#000000');
}

export function hline(doc: Doc, x: number, y: number, w: number): void {
  doc.lineWidth(0.6).moveTo(x, y).lineTo(x + w, y).stroke('#000000');
}

export function dashedHline(doc: Doc, x: number, y: number, w: number): void {
  doc.save();
  doc.lineWidth(0.5).dash(2, { space: 2 }).moveTo(x, y).lineTo(x + w, y).stroke('#000000');
  doc.undash();
  doc.restore();
}

export interface GridCell {
  w: number;
  label: string;
  value: string;
  labelSize?: number;
  valueSize?: number;
  bold?: boolean;
}

export function fitWidth(doc: Doc, text: string, maxWidth: number, size: number, bold?: boolean): string {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
  if (doc.widthOfString(text) <= maxWidth) return text;
  let t = text;
  const ell = '…';
  while (t.length > 1 && doc.widthOfString(t + ell) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}${ell}`;
}

/** Células com larguras relativas; texto truncado (sem overflow). */
export function gridRow(
  doc: Doc,
  x: number,
  y: number,
  totalW: number,
  h: number,
  cells: GridCell[],
): void {
  const sum = cells.reduce((s, c) => s + c.w, 0);
  const scale = totalW / sum;
  let cx = x;
  for (const cell of cells) {
    const cw = cell.w * scale;
    box(doc, cx, y, cw, h);
    const labelSize = cell.labelSize ?? 5;
    const valueSize = cell.valueSize ?? 7;
    doc.fillColor('#000000')
      .font('Helvetica')
      .fontSize(labelSize)
      .text(cell.label, cx + 2.5, y + 2.5, { width: cw - 5, lineBreak: false });
    const val = fitWidth(doc, cell.value || ' ', cw - 5, valueSize, cell.bold);
    doc.font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(valueSize)
      .text(val, cx + 2.5, y + 10, { width: cw - 5, lineBreak: false });
    cx += cw;
  }
}

export function sectionTitle(doc: Doc, x: number, y: number, w: number, title: string): number {
  const h = mm(4.5);
  box(doc, x, y, w, h);
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(5.5)
    .text(title, x + 2.5, y + 2, { width: w - 5, lineBreak: false });
  return y + h;
}
