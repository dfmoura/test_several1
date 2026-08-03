import { prisma } from '../../infrastructure/prisma/client.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { AppError, NotFoundError } from '../shared/errors/app-error.js';
import { Decimal } from '../shared/decimal/money.js';
import { buildZip } from '../shared/zip/store-zip.js';

const LAYOUT = 'RLP-CONTADOR-v1';

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [
    `# layout=${LAYOUT}`,
    headers.join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

function periodoBounds(ano: number, mes: number) {
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    throw new AppError('PERIODO_INVALIDO', 'ano inválido', 400);
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new AppError('PERIODO_INVALIDO', 'mes inválido (1-12)', 400);
  }
  const inicio = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mes, 1, 0, 0, 0));
  return { inicio, fim, label: `${ano}_${String(mes).padStart(2, '0')}` };
}

export async function gerarExportContador(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ano: number;
  mes: number;
  ip?: string | null;
  correlationId?: string | null;
}) {
  const empresa = await prisma.empresa.findUnique({ where: { id: params.empresaId } });
  if (!empresa) throw new NotFoundError('Empresa não encontrada');

  const { inicio, fim, label } = periodoBounds(params.ano, params.mes);

  const nfs = await prisma.documentoFiscal.findMany({
    where: {
      empresaId: params.empresaId,
      status: 'AUTORIZADA',
      OR: [
        { autorizadoEm: { gte: inicio, lt: fim } },
        { autorizadoEm: null, criadoEm: { gte: inicio, lt: fim } },
      ],
    },
    include: { pedido: { include: { parceiro: true } } },
    orderBy: { id: 'asc' },
  });

  const titulos = await prisma.titulo.findMany({
    where: {
      empresaId: params.empresaId,
      OR: [
        { criadoEm: { gte: inicio, lt: fim } },
        {
          status: { in: ['ABERTO', 'COBRADO', 'PARCIALMENTE_BAIXADO'] },
        },
        {
          baixas: { some: { baixadoEm: { gte: inicio, lt: fim } } },
        },
      ],
    },
    include: {
      baixas: { select: { codigo: true } },
      parceiro: true,
      documentoFiscal: true,
    },
    orderBy: { id: 'asc' },
  });

  const baixas = await prisma.baixaTitulo.findMany({
    where: {
      empresaId: params.empresaId,
      baixadoEm: { gte: inicio, lt: fim },
    },
    include: { titulo: true },
    orderBy: { id: 'asc' },
  });

  const faturamentoCsv = toCsv(
    [
      'data',
      'chave',
      'tipo',
      'codigo_nf',
      'serie',
      'numero',
      'destinatario',
      'cnpj_cpf',
      'valor',
      'cfop',
      'pedido',
      'xml_ref',
      'pdf_ref',
    ],
    nfs.map((nf) => [
      (nf.autorizadoEm ?? nf.criadoEm).toISOString().slice(0, 10),
      nf.chave44,
      nf.tipo,
      nf.codigo,
      nf.serie,
      nf.numero,
      nf.pedido.parceiro.razaoSocial,
      nf.pedido.parceiro.documento,
      new Decimal(nf.valorTotal.toString()).toFixed(2),
      nf.naturezaOperacao,
      nf.pedido.codigo,
      nf.xmlRef,
      nf.pdfRef,
    ]),
  );

  const titulosCsv = toCsv(
    [
      'codigo',
      'tipo',
      'status',
      'natureza',
      'parceiro',
      'documento',
      'valor_original',
      'valor_aberto',
      'valor_baixado',
      'vencimento',
      'nf',
      'pedido',
      'baixas',
    ],
    titulos.map((t) => [
      t.codigo,
      t.tipo,
      t.status,
      t.naturezaGerencial,
      t.parceiro.razaoSocial,
      t.parceiro.documento,
      new Decimal(t.valorOriginal.toString()).toFixed(2),
      new Decimal(t.valorAberto.toString()).toFixed(2),
      new Decimal(t.valorBaixado.toString()).toFixed(2),
      t.vencimentoEm.toISOString().slice(0, 10),
      t.documentoFiscal.codigo,
      t.pedidoId.toString(),
      t.baixas.map((b) => b.codigo).join('|'),
    ]),
  );

  const baixasCsv = toCsv(
    ['codigo', 'titulo', 'valor', 'baixado_em', 'forma', 'observacoes'],
    baixas.map((b) => [
      b.codigo,
      b.titulo.codigo,
      new Decimal(b.valor.toString()).toFixed(2),
      b.baixadoEm.toISOString().slice(0, 10),
      b.forma,
      b.observacoes,
    ]),
  );

  const leituras = [
    `# layout=${LAYOUT}`,
    `empresa=${empresa.codigo}`,
    `cnpj=${empresa.cnpj}`,
    `periodo=${label}`,
    `gerado_em=${new Date().toISOString()}`,
    '',
    '## XML/PDF refs (stub:// sem binário no pacote)',
    ...nfs.map(
      (nf) =>
        `${nf.codigo}\txml=${nf.xmlRef ?? '-'}\tpdf=${nf.pdfRef ?? '-'}\tchave=${nf.chave44 ?? '-'}`,
    ),
    '',
    `totais: nf=${nfs.length} titulos=${titulos.length} baixas=${baixas.length}`,
  ].join('\n');

  const zipName = `RLP_${empresa.cnpj}_${label}_v1.zip`;
  const zip = buildZip([
    { name: 'faturamento_resumo.csv', content: faturamentoCsv },
    { name: 'titulo_cr_cp.csv', content: titulosCsv },
    { name: 'baixas.csv', content: baixasCsv },
    { name: 'leituras.txt', content: `${leituras}\n` },
  ]);

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'GER.EXPORT',
    entidade: 'ExportContador',
    entidadeId: zipName,
    paraJson: {
      ano: params.ano,
      mes: params.mes,
      nf: nfs.length,
      titulos: titulos.length,
      baixas: baixas.length,
      bytes: zip.length,
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    filename: zipName,
    contentType: 'application/zip',
    buffer: zip,
    meta: {
      layout: LAYOUT,
      periodo: label,
      empresaCodigo: empresa.codigo,
      contagens: {
        nf: nfs.length,
        titulos: titulos.length,
        baixas: baixas.length,
      },
    },
  };
}
