/**
 * DANFE modelo 55 — layout oficial (retrato / Manual de Orientação do Contribuinte).
 * Canhoto horizontal no topo · grade SEFAZ · sem alterar contratos da API.
 */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { EnderecoParsed, NfeParsed } from '@nfe/xml';
import { drawCode128 } from './danfe-barcode.js';
import {
  type Doc,
  M,
  PAGE_H,
  PAGE_W,
  W,
  X,
  box,
  dashedHline,
  fitWidth,
  gridRow,
  hline,
  mm,
  sectionTitle,
  vline,
} from './danfe-layout.js';

function money(v: string | number): string {
  const n = typeof v === 'number' ? v : Number(v);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCnpj(v: string): string {
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return v;
}

function fmtCep(v: string): string {
  const d = v.replace(/\D/g, '');
  return d.length === 8 ? d.replace(/^(\d{5})(\d{3})$/, '$1-$2') : v;
}

function fmtChave(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function fmtDhEmi(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
}

function fmtEndereco(e: EnderecoParsed): string {
  const p1 = [e.logradouro, e.numero, e.complemento].filter(Boolean).join(', ');
  const p2 = [e.bairro, `${e.municipio} / ${e.uf}`, fmtCep(e.cep)].filter(Boolean).join(' — ');
  return [p1, p2].filter(Boolean).join(' — ');
}

/** Canhoto oficial: faixa horizontal no topo. */
function drawCanhoto(doc: Doc, parsed: NfeParsed, y: number): number {
  const h = mm(18);
  const wNfe = mm(38);
  const wData = mm(35);
  const wAssin = W - wNfe - wData;

  box(doc, X, y, W, h);
  vline(doc, X + wAssin, y, h);
  vline(doc, X + wAssin + wData, y, h);

  // Texto RECEBEMOS (até 2 linhas, sem estourar a caixa)
  doc.fillColor('#000000').font('Helvetica').fontSize(5.5);
  const recebemos =
    `RECEBEMOS DE ${parsed.emitNome} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO`;
  doc.text(recebemos, X + 3, y + 3, {
    width: wAssin - 6,
    height: mm(9),
    lineBreak: true,
    ellipsis: true,
  });
  doc.font('Helvetica').fontSize(5)
    .text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', X + 3, y + h - mm(5), {
      width: wAssin - 6, lineBreak: false,
    });

  // Data
  doc.font('Helvetica').fontSize(5)
    .text('DATA DE RECEBIMENTO', X + wAssin + 3, y + 3, { width: wData - 6, lineBreak: false });
  hline(doc, X + wAssin + 4, y + h - mm(6), wData - 8);

  // NF-e nº / série
  doc.font('Helvetica-Bold').fontSize(7).text('NF-e', X + wAssin + wData + 3, y + 3, {
    width: wNfe - 6, align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(8)
    .text(`Nº ${String(parsed.numero).padStart(9, '0')}`, X + wAssin + wData + 3, y + mm(7), {
      width: wNfe - 6, align: 'center',
    });
  doc.font('Helvetica').fontSize(7)
    .text(`Série ${parsed.serie}`, X + wAssin + wData + 3, y + mm(12), {
      width: wNfe - 6, align: 'center',
    });

  y += h + mm(1.5);
  // Linha de corte
  dashedHline(doc, X, y, W);
  doc.font('Helvetica').fontSize(4.5).fillColor('#444444')
    .text('✂  Corte na linha pontilhada', X, y + 1, { width: W, align: 'center' });
  doc.fillColor('#000000');
  return y + mm(4);
}

/** Cabeçalho: emitente | DANFE | chave + código de barras. */
function drawHeader(doc: Doc, parsed: NfeParsed, y: number): number {
  const h = mm(36);
  const wDanfe = mm(32);
  const wChave = mm(70);
  const wEmit = W - wDanfe - wChave;

  box(doc, X, y, wEmit, h);
  box(doc, X + wEmit, y, wDanfe, h);
  box(doc, X + wEmit + wDanfe, y, wChave, h);

  // Emitente
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000')
    .text(fitWidth(doc, parsed.emitNome, wEmit - 8, 8, true), X + 4, y + 4, {
      width: wEmit - 8, lineBreak: false,
    });
  let ey = y + mm(8);
  if (parsed.emitFantasia) {
    doc.font('Helvetica').fontSize(6.5)
      .text(fitWidth(doc, parsed.emitFantasia, wEmit - 8, 6.5), X + 4, ey, {
        width: wEmit - 8, lineBreak: false,
      });
    ey += mm(5);
  }
  doc.font('Helvetica').fontSize(6)
    .text(fitWidth(doc, fmtEndereco(parsed.emitEnder), wEmit - 8, 6), X + 4, ey, {
      width: wEmit - 8, height: mm(10), lineBreak: true,
    });
  doc.font('Helvetica').fontSize(6.5)
    .text(`CNPJ: ${fmtCnpj(parsed.emitCnpj)}`, X + 4, y + h - mm(9), { width: wEmit - 8 })
    .text(`IE: ${parsed.emitIE}`, X + 4, y + h - mm(5), { width: wEmit - 8 });

  // DANFE
  const xD = X + wEmit;
  doc.font('Helvetica-Bold').fontSize(11).text('DANFE', xD, y + 3, { width: wDanfe, align: 'center' });
  doc.font('Helvetica').fontSize(5)
    .text('Documento Auxiliar da\nNota Fiscal Eletrônica', xD + 2, y + mm(8), {
      width: wDanfe - 4, align: 'center',
    });

  const saida = parsed.tpNF !== '0';
  doc.font('Helvetica').fontSize(5.5);
  doc.text('0 - ENTRADA', xD + 3, y + mm(17));
  doc.text('1 - SAÍDA', xD + 3, y + mm(21.5));
  const markY = saida ? y + mm(21.5) : y + mm(17);
  box(doc, xD + wDanfe - mm(8), markY, mm(5), mm(4));
  doc.font('Helvetica-Bold').fontSize(6)
    .text('X', xD + wDanfe - mm(7.3), markY + 0.3);

  doc.font('Helvetica-Bold').fontSize(7)
    .text(`Nº ${String(parsed.numero).padStart(9, '0')}`, xD + 2, y + h - mm(10), {
      width: wDanfe - 4, align: 'center',
    });
  doc.font('Helvetica').fontSize(6)
    .text(`SÉRIE ${parsed.serie}   Folha 1/1`, xD + 2, y + h - mm(5.5), {
      width: wDanfe - 4, align: 'center',
    });

  // Chave + barcode
  const xC = xD + wDanfe;
  doc.font('Helvetica').fontSize(5)
    .text('CHAVE DE ACESSO', xC + 3, y + 3, { width: wChave - 6 });
  doc.font('Helvetica-Bold').fontSize(6.5)
    .text(fmtChave(parsed.chaveAcesso), xC + 3, y + mm(6), {
      width: wChave - 6, align: 'center', lineBreak: false,
    });
  try {
    drawCode128(doc, xC + mm(3), y + mm(12), wChave - mm(6), mm(12), parsed.chaveAcesso);
  } catch {
    // barcode opcional
  }
  doc.font('Helvetica').fontSize(5)
    .text(
      parsed.tpAmb === '1' ? 'Ambiente de Produção' : 'Ambiente de Homologação',
      xC + 3, y + h - mm(5), { width: wChave - 6, align: 'center' },
    );

  return y + h;
}

function drawOperacao(doc: Doc, parsed: NfeParsed, y: number): number {
  const h = mm(11);
  gridRow(doc, X, y, W, h, [
    { w: 45, label: 'NATUREZA DA OPERAÇÃO', value: parsed.naturezaOperacao, bold: true },
    { w: 30, label: 'PROTOCOLO DE AUTORIZAÇÃO DE USO', value: parsed.nProt ?? '', valueSize: 6.5 },
    { w: 25, label: 'INSCRIÇÃO ESTADUAL', value: parsed.emitIE, bold: true },
  ]);
  return y + h;
}

function drawInscricoes(doc: Doc, parsed: NfeParsed, y: number): number {
  const h = mm(9);
  gridRow(doc, X, y, W, h, [
    { w: 50, label: 'INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO', value: '' },
    { w: 50, label: 'CNPJ', value: fmtCnpj(parsed.emitCnpj), bold: true },
  ]);
  return y + h;
}

function drawDestinatario(doc: Doc, parsed: NfeParsed, y: number): number {
  y = sectionTitle(doc, X, y, W, 'DESTINATÁRIO / REMETENTE');
  const h1 = mm(10);
  gridRow(doc, X, y, W, h1, [
    { w: 58, label: 'NOME / RAZÃO SOCIAL', value: parsed.destNome, bold: true },
    { w: 22, label: 'CNPJ / CPF', value: fmtCnpj(parsed.destDoc), bold: true },
    { w: 20, label: 'DATA DA EMISSÃO', value: fmtDhEmi(parsed.dhEmi), bold: true, valueSize: 6 },
  ]);
  y += h1;
  const h2 = mm(10);
  gridRow(doc, X, y, W, h2, [
    { w: 50, label: 'ENDEREÇO', value: fmtEndereco(parsed.destEnder), bold: true, valueSize: 6 },
    { w: 25, label: 'BAIRRO / DISTRITO', value: parsed.destEnder.bairro, bold: true },
    { w: 25, label: 'CEP', value: fmtCep(parsed.destEnder.cep), bold: true },
  ]);
  y += h2;
  const h3 = mm(9);
  gridRow(doc, X, y, W, h3, [
    { w: 40, label: 'MUNICÍPIO', value: parsed.destEnder.municipio, bold: true },
    { w: 8, label: 'UF', value: parsed.destEnder.uf, bold: true },
    { w: 27, label: 'FONE / FAX', value: parsed.destEnder.fone ?? '', bold: true },
    { w: 25, label: 'INSCRIÇÃO ESTADUAL', value: parsed.destIE ?? 'ISENTO', bold: true },
  ]);
  return y + h3;
}

function drawFatura(doc: Doc, y: number): number {
  const h = mm(8);
  gridRow(doc, X, y, W, h, [{ w: 100, label: 'FATURA / DUPLICATAS', value: '' }]);
  return y + h;
}

function drawImpostos(doc: Doc, parsed: NfeParsed, y: number): number {
  y = sectionTitle(doc, X, y, W, 'CÁLCULO DO IMPOSTO');
  const h = mm(10);
  const rows = [
    [
      ['BASE DE CÁLC. DO ICMS', money(parsed.vBC)],
      ['VALOR DO ICMS', money(parsed.vICMS)],
      ['BASE DE CÁLC. ICMS ST', '0,00'],
      ['VALOR DO ICMS ST', '0,00'],
      ['V. TOTAL DOS PRODUTOS', money(parsed.valorProd)],
    ],
    [
      ['VALOR DO FRETE', money(parsed.vFrete)],
      ['VALOR DO SEGURO', '0,00'],
      ['DESCONTO', money(parsed.vDesc)],
      ['OUTRAS DESPESAS', '0,00'],
      ['VALOR DO IPI', money(parsed.vIPI)],
      ['V. TOTAL DA NOTA', money(parsed.valorNf)],
    ],
  ];

  for (const row of rows) {
    box(doc, X, y, W, h);
    const cw = W / row.length;
    for (let i = 1; i < row.length; i++) vline(doc, X + i * cw, y, h);
    for (let i = 0; i < row.length; i++) {
      const cx = X + i * cw;
      const isTotal = row[i]![0]!.includes('TOTAL DA NOTA') || row[i]![0]!.includes('TOTAL DOS PRODUTOS');
      doc.font('Helvetica').fontSize(4.5).fillColor('#000000')
        .text(row[i]![0]!, cx + 2, y + 2, { width: cw - 4, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(isTotal ? 7.5 : 7)
        .text(row[i]![1]!, cx + 2, y + mm(5), { width: cw - 4, align: 'right', lineBreak: false });
    }
    y += h;
  }
  return y;
}

function drawTransportador(doc: Doc, parsed: NfeParsed, y: number): number {
  y = sectionTitle(doc, X, y, W, 'TRANSPORTADOR / VOLUMES TRANSPORTADOS');
  const frete: Record<string, string> = {
    '0': '0 - Emitente',
    '1': '1 - Destinatário',
    '2': '2 - Terceiros',
    '9': '9 - Sem frete',
  };
  const h1 = mm(9);
  gridRow(doc, X, y, W, h1, [
    { w: 40, label: 'NOME / RAZÃO SOCIAL', value: '' },
    { w: 18, label: 'FRETE POR CONTA', value: frete[parsed.modFrete] ?? parsed.modFrete },
    { w: 14, label: 'CÓDIGO ANTT', value: '' },
    { w: 14, label: 'PLACA DO VEÍCULO', value: '' },
    { w: 6, label: 'UF', value: '' },
    { w: 8, label: 'CNPJ / CPF', value: '' },
  ]);
  y += h1;
  const h2 = mm(9);
  gridRow(doc, X, y, W, h2, [
    { w: 30, label: 'ENDEREÇO', value: '' },
    { w: 25, label: 'MUNICÍPIO', value: '' },
    { w: 8, label: 'UF', value: '' },
    { w: 20, label: 'INSCRIÇÃO ESTADUAL', value: '' },
    { w: 17, label: 'QUANTIDADE', value: '' },
  ]);
  y += h2;
  const h3 = mm(9);
  gridRow(doc, X, y, W, h3, [
    { w: 20, label: 'ESPÉCIE', value: '' },
    { w: 20, label: 'MARCA', value: '' },
    { w: 20, label: 'NUMERAÇÃO', value: '' },
    { w: 20, label: 'PESO BRUTO', value: '' },
    { w: 20, label: 'PESO LÍQUIDO', value: '' },
  ]);
  return y + h3;
}

const PROD_COLS = [
  { label: 'CÓDIGO', pct: 9 },
  { label: 'DESCRIÇÃO DO PRODUTO / SERVIÇO', pct: 34 },
  { label: 'NCM/SH', pct: 9 },
  { label: 'CST', pct: 5 },
  { label: 'CFOP', pct: 6 },
  { label: 'UN', pct: 5 },
  { label: 'QUANT.', pct: 8 },
  { label: 'V. UNITÁRIO', pct: 12 },
  { label: 'V. TOTAL', pct: 12 },
] as const;

function drawProdutos(doc: Doc, parsed: NfeParsed, y: number, pageBottom: number): number {
  y = sectionTitle(doc, X, y, W, 'DADOS DOS PRODUTOS / SERVIÇOS');
  const widths = PROD_COLS.map((c) => (W * c.pct) / 100);
  const headH = mm(5.5);
  const rowH = mm(5.5);

  box(doc, X, y, W, headH);
  let cx = X;
  doc.font('Helvetica-Bold').fontSize(4.5).fillColor('#000000');
  for (let i = 0; i < PROD_COLS.length; i++) {
    const cw = widths[i]!;
    if (i > 0) vline(doc, cx, y, headH);
    doc.text(PROD_COLS[i]!.label, cx + 1, y + 2, {
      width: cw - 2, align: 'center', lineBreak: false,
    });
    cx += cw;
  }
  y += headH;

  for (const item of parsed.itens) {
    if (y + rowH > pageBottom - mm(28)) {
      doc.addPage();
      y = M;
      y = sectionTitle(doc, X, y, W, 'DADOS DOS PRODUTOS / SERVIÇOS (continuação)');
    }
    box(doc, X, y, W, rowH);
    cx = X;
    const vals = [
      item.codigo,
      item.descricao,
      item.ncm,
      '—',
      item.cfop,
      item.unidade,
      Number(item.quantidade).toFixed(2),
      money(item.valorUnitario),
      money(item.valorTotal),
    ];
    doc.font('Helvetica').fontSize(5);
    for (let i = 0; i < PROD_COLS.length; i++) {
      const cw = widths[i]!;
      if (i > 0) vline(doc, cx, y, rowH);
      const align = i >= 6 ? 'right' : 'left';
      const t = fitWidth(doc, String(vals[i] ?? ''), cw - 3, 5);
      doc.text(t, cx + 1.5, y + 1.5, { width: cw - 3, align, lineBreak: false });
      cx += cw;
    }
    y += rowH;
  }
  return y;
}

async function drawDadosAdicionais(
  doc: Doc,
  parsed: NfeParsed,
  y: number,
  pageBottom: number,
): Promise<void> {
  if (pageBottom - y < mm(18)) return;
  y = sectionTitle(doc, X, y, W, 'DADOS ADICIONAIS');
  const boxH = pageBottom - y;
  const wLeft = W * 0.68;
  const wRight = W - wLeft;

  box(doc, X, y, W, boxH);
  vline(doc, X + wLeft, y, boxH);

  doc.font('Helvetica-Bold').fontSize(5).fillColor('#000000')
    .text('INFORMAÇÕES COMPLEMENTARES', X + 3, y + 3);
  const texto = parsed.infCpl
    ?? (parsed.tpAmb === '2'
      ? 'NF-e emitida em ambiente de homologação — sem valor fiscal.'
      : '');
  doc.font('Helvetica').fontSize(5.5)
    .text(texto, X + 3, y + mm(5), { width: wLeft - 6, height: boxH - mm(7) });

  doc.font('Helvetica-Bold').fontSize(5)
    .text('RESERVADO AO FISCO', X + wLeft + 3, y + 3);

  const consultaUrl =
    `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&nfe=${parsed.chaveAcesso}`;
  try {
    const png = await QRCode.toBuffer(consultaUrl, { margin: 1, width: 110 });
    const qr = Math.min(mm(18), boxH - mm(10));
    if (qr > mm(10)) {
      doc.image(png, X + wLeft + (wRight - qr) / 2, y + mm(6), { width: qr, height: qr });
    }
  } catch {
    // QR opcional
  }
}

export async function renderDanfe(parsed: NfeParsed, situacao: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const bottom = PAGE_H - M;
  let y = M;

  y = drawCanhoto(doc, parsed, y);
  y = drawHeader(doc, parsed, y);
  y = drawOperacao(doc, parsed, y);
  y = drawInscricoes(doc, parsed, y);
  y = drawDestinatario(doc, parsed, y);
  y = drawFatura(doc, y);
  y = drawImpostos(doc, parsed, y);
  y = drawTransportador(doc, parsed, y);
  y = drawProdutos(doc, parsed, y, bottom - mm(26));
  await drawDadosAdicionais(doc, parsed, y, bottom);

  if (situacao === 'CANCELADA') {
    doc.save();
    doc.fillColor('#dc2626').opacity(0.2);
    doc.font('Helvetica-Bold').fontSize(48);
    const cy = PAGE_H / 2;
    doc.rotate(-30, { origin: [PAGE_W / 2, cy] });
    doc.text('CANCELADA', PAGE_W / 4, cy - 20, { width: PAGE_W / 2, align: 'center' });
    doc.restore();
  }

  doc.end();
  return done;
}
