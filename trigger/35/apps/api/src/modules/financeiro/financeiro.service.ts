import { Decimal, money, moneyToString } from '../shared/decimal/money.js';
import { getBankProvider } from './bank/bank.factory.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { isBankCobrancaHabilitada } from '../integracoes/kill-switch.js';
import { nextCodigoDocumento } from '../cadastros/shared/codigo.service.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { AppError, NotFoundError } from '../shared/errors/app-error.js';
import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

const includeTit = {
  parceiro: true,
  pedido: true,
  documentoFiscal: true,
  baixas: { orderBy: { criadoEm: 'asc' as const } },
  cobrancas: { orderBy: { criadoEm: 'desc' as const } },
};

function assertNaturezaReceita(codigo: string) {
  const c = codigo.trim();
  if (!/^[1-5](\.\d+)*$/.test(c)) {
    throw new AppError(
      'NATUREZA_INVALIDA',
      'Natureza gerencial deve ser grupo 1–5 (LAI/9.xx proibido)',
      400,
      { natureza: c },
    );
  }
  if (c.startsWith('9')) {
    throw new AppError('NATUREZA_LAI', 'Natureza LAI (9.xx) proibida no ERP', 400);
  }
}

function serializeTitulo(
  t: Prisma.TituloGetPayload<{ include: typeof includeTit }>,
) {
  return {
    id: t.id.toString(),
    codigo: t.codigo,
    tipo: t.tipo,
    status: t.status,
    naturezaGerencial: t.naturezaGerencial,
    valorOriginal: moneyToString(new Decimal(t.valorOriginal.toString())),
    valorAberto: moneyToString(new Decimal(t.valorAberto.toString())),
    valorBaixado: moneyToString(new Decimal(t.valorBaixado.toString())),
    vencimentoEm: t.vencimentoEm.toISOString().slice(0, 10),
    observacoes: t.observacoes,
    criadoEm: t.criadoEm,
    parceiro: {
      id: t.parceiro.id.toString(),
      codigo: t.parceiro.codigo,
      razaoSocial: t.parceiro.razaoSocial,
    },
    pedido: {
      id: t.pedido.id.toString(),
      codigo: t.pedido.codigo,
    },
    documentoFiscal: t.documentoFiscal
      ? {
          id: t.documentoFiscal.id.toString(),
          codigo: t.documentoFiscal.codigo,
          tipo: t.documentoFiscal.tipo,
          chave44: t.documentoFiscal.chave44,
          numero: t.documentoFiscal.numero,
          serie: t.documentoFiscal.serie,
        }
      : null,
    origem: t.origem,
    baixas: t.baixas.map((b) => ({
      id: b.id.toString(),
      codigo: b.codigo,
      valor: moneyToString(new Decimal(b.valor.toString())),
      baixadoEm: b.baixadoEm.toISOString().slice(0, 10),
      forma: b.forma,
      idempotencyKey: b.idempotencyKey,
    })),
    cobrancas: t.cobrancas.map((c) => ({
      id: c.id.toString(),
      codigo: c.codigo,
      status: c.status,
      valor: moneyToString(new Decimal(c.valor.toString())),
      nossoNumero: c.nossoNumero,
      linhaDigitavel: c.linhaDigitavel,
      pdfRef: c.pdfRef,
      adapter: c.adapter,
    })),
  };
}

async function naturezaPadrao(empresaId: bigint): Promise<string> {
  const p = await prisma.parametroEmpresa.findUnique({
    where: {
      empresaId_chave: { empresaId, chave: 'natureza_receita_venda_padrao' },
    },
  });
  const v = p?.valor?.trim() || '1.01';
  assertNaturezaReceita(v);
  return v;
}

/** UC-FIN-001 — 1 TIT por NF autorizada (idempotente por documento_fiscal_id). */
export async function gerarTituloDaNf(params: {
  empresaId: bigint;
  documentoFiscalId: bigint;
  usuarioId?: bigint | null;
  ip?: string;
  correlationId?: string;
}) {
  const existing = await prisma.titulo.findUnique({
    where: { documentoFiscalId: params.documentoFiscalId },
    include: includeTit,
  });
  if (existing) {
    return { titulo: serializeTitulo(existing), criado: false as const };
  }

  const nf = await prisma.documentoFiscal.findFirst({
    where: { id: params.documentoFiscalId, empresaId: params.empresaId },
    include: { pedido: true },
  });
  if (!nf) throw new NotFoundError('Documento fiscal não encontrado');
  if (nf.status !== 'AUTORIZADA') {
    throw new AppError('NF_NAO_AUTORIZADA', 'Só NF AUTORIZADA gera TIT', 400);
  }

  const natureza = await naturezaPadrao(params.empresaId);
  const valor = money(new Decimal(nf.valorTotal.toString()));
  const prazo = nf.pedido.prazoDias || 7;
  const venc = new Date();
  venc.setUTCDate(venc.getUTCDate() + prazo);
  const vencimentoEm = new Date(venc.toISOString().slice(0, 10));

  const codigo = await nextCodigoDocumento(params.empresaId, 'TIT');
  try {
    const created = await prisma.titulo.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        tipo: 'RECEBER',
        status: 'ABERTO',
        pedidoId: nf.pedidoId,
        documentoFiscalId: nf.id,
        parceiroId: nf.pedido.parceiroId,
        naturezaGerencial: natureza,
        valorOriginal: moneyToString(valor),
        valorAberto: moneyToString(valor),
        valorBaixado: '0.00',
        vencimentoEm,
        observacoes: `Origem ${nf.codigo} (NF série/núm ${nf.serie ?? '-'}/${nf.numero ?? '-'} — TIT ≠ número SEFAZ)`,
      },
      include: includeTit,
    });

    await prisma.outboxEvent.create({
      data: {
        empresaId: params.empresaId,
        tipo: 'TituloGerado',
        agregadoTipo: 'titulo',
        agregadoId: created.id.toString(),
        payload: {
          codigo: created.codigo,
          nfCodigo: nf.codigo,
          valor: moneyToString(valor),
        },
        idempotencyKey: `tit-nf-${nf.id}`,
      },
    });

    if (params.usuarioId) {
      await registrarAuditoria({
        empresaId: params.empresaId,
        usuarioId: params.usuarioId,
        acao: 'FIN.TIT.GERAR',
        entidade: 'Titulo',
        entidadeId: created.codigo,
        paraJson: {
          codigo: created.codigo,
          nfCodigo: nf.codigo,
          valor: moneyToString(valor),
          natureza,
        },
        ip: params.ip,
        correlationId: params.correlationId,
      });
    }

    return { titulo: serializeTitulo(created), criado: true as const };
  } catch (err) {
    // corrida de idempotência
    const again = await prisma.titulo.findUnique({
      where: { documentoFiscalId: params.documentoFiscalId },
      include: includeTit,
    });
    if (again) return { titulo: serializeTitulo(again), criado: false as const };
    throw err;
  }
}

export async function sincronizarTitulosDeNfs(empresaId: bigint) {
  const nfs = await prisma.documentoFiscal.findMany({
    where: {
      empresaId,
      status: 'AUTORIZADA',
      titulo: null,
    },
    select: { id: true },
  });
  const out = [];
  for (const nf of nfs) {
    out.push(await gerarTituloDaNf({ empresaId, documentoFiscalId: nf.id }));
  }
  return out;
}

export async function listarTitulos(params: {
  empresaId: bigint;
  status?: string;
  limit?: number;
}) {
  await sincronizarTitulosDeNfs(params.empresaId);
  const rows = await prisma.titulo.findMany({
    where: {
      empresaId: params.empresaId,
      ...(params.status ? { status: params.status as never } : {}),
    },
    include: includeTit,
    orderBy: { criadoEm: 'desc' },
    take: Math.min(params.limit ?? 80, 150),
  });
  return rows.map(serializeTitulo);
}

export async function baixarTituloManual(params: {
  empresaId: bigint;
  usuarioId: bigint;
  tituloId: bigint;
  valor?: string | null;
  baixadoEm?: string | null;
  forma?: string | null;
  observacoes?: string | null;
  idempotencyKey?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const tit = await prisma.titulo.findFirst({
    where: { id: params.tituloId, empresaId: params.empresaId },
    include: includeTit,
  });
  if (!tit) throw new NotFoundError('Título não encontrado');
  if (!['ABERTO', 'COBRADO', 'PARCIALMENTE_BAIXADO'].includes(tit.status)) {
    throw new AppError('TIT_NAO_ABERTO', `Título em ${tit.status} não aceita baixa`, 400);
  }

  const idem =
    params.idempotencyKey?.trim() ||
    createHash('sha256')
      .update(
        `bx:${tit.id}:${params.valor ?? 'full'}:${params.baixadoEm ?? 'hoje'}`,
      )
      .digest('hex')
      .slice(0, 64);

  const existBx = await prisma.baixaTitulo.findUnique({
    where: { idempotencyKey: idem },
  });
  if (existBx) {
    const t2 = await prisma.titulo.findUniqueOrThrow({
      where: { id: tit.id },
      include: includeTit,
    });
    return { titulo: serializeTitulo(t2), replay: true as const };
  }

  const aberto = money(new Decimal(tit.valorAberto.toString()));
  const valorBx = params.valor
    ? money(new Decimal(params.valor))
    : aberto;
  if (valorBx.lte(0)) {
    throw new AppError('VALOR_INVALIDO', 'Valor da baixa deve ser > 0', 400);
  }
  if (valorBx.gt(aberto)) {
    throw new AppError(
      'VALOR_EXCEDE_ABERTO',
      `Baixa ${moneyToString(valorBx)} excede aberto ${moneyToString(aberto)}`,
      400,
    );
  }

  const baixadoEm = params.baixadoEm
    ? new Date(params.baixadoEm)
    : new Date(new Date().toISOString().slice(0, 10));

  const codigo = await nextCodigoDocumento(params.empresaId, 'BX');
  const novoBaixado = money(new Decimal(tit.valorBaixado.toString()).plus(valorBx));
  const novoAberto = money(aberto.minus(valorBx));
  const novoStatus =
    novoAberto.isZero() ? 'BAIXADO' : 'PARCIALMENTE_BAIXADO';

  const updated = await prisma.$transaction(async (tx) => {
    await tx.baixaTitulo.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        tituloId: tit.id,
        valor: moneyToString(valorBx),
        baixadoEm,
        forma: params.forma ?? 'MANUAL',
        idempotencyKey: idem,
        observacoes: params.observacoes ?? null,
        criadoPorId: params.usuarioId,
      },
    });
    const tituloUpdated = await tx.titulo.update({
      where: { id: tit.id },
      data: {
        valorAberto: moneyToString(novoAberto),
        valorBaixado: moneyToString(novoBaixado),
        status: novoStatus,
      },
      include: includeTit,
    });

    if (tituloUpdated.origem === 'SINAL' && novoStatus === 'BAIXADO') {
      const ped = await tx.pedido.findUnique({ where: { id: tituloUpdated.pedidoId } });
      if (ped?.status === 'AGUARDA_ADIANTAMENTO') {
        await tx.pedido.update({
          where: { id: ped.id },
          data: { status: 'LIBERADO', creditoLiberadoEm: new Date() },
        });
      }
    }

    return tituloUpdated;
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'BaixaEfetuada',
      agregadoTipo: 'titulo',
      agregadoId: tit.id.toString(),
      payload: { tituloCodigo: tit.codigo, baixaCodigo: codigo, valor: moneyToString(valorBx) },
      idempotencyKey: `bx-done-${idem}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FIN.BX.MANUAL',
    entidade: 'Titulo',
    entidadeId: tit.codigo,
    deJson: { status: tit.status, valorAberto: tit.valorAberto.toString() },
    paraJson: {
      status: updated.status,
      valorAberto: updated.valorAberto.toString(),
      baixaCodigo: codigo,
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return { titulo: serializeTitulo(updated), replay: false as const };
}

/** UC-FIN-002 — COB stub vinculada ao TIT (idempotente). */
export async function emitirCobranca(params: {
  empresaId: bigint;
  usuarioId: bigint;
  tituloId: bigint;
  idempotencyKey?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  if (!(await isBankCobrancaHabilitada(params.empresaId))) {
    throw new AppError(
      'BANK_KILL_SWITCH',
      'Cobrança bancária desabilitada (bank_cobranca_habilitada=false)',
      403,
    );
  }

  const tit = await prisma.titulo.findFirst({
    where: { id: params.tituloId, empresaId: params.empresaId },
    include: { ...includeTit, parceiro: true },
  });
  if (!tit) throw new NotFoundError('Título não encontrado');
  if (!['ABERTO', 'COBRADO', 'PARCIALMENTE_BAIXADO'].includes(tit.status)) {
    throw new AppError('TIT_INELIGIVEL_COB', `Título em ${tit.status} não emite COB`, 400);
  }
  if (money(new Decimal(tit.valorAberto.toString())).lte(0)) {
    throw new AppError('TIT_SEM_SALDO', 'Título sem valor em aberto', 400);
  }

  const idem =
    params.idempotencyKey?.trim() ||
    createHash('sha256')
      .update(`cob:${tit.id}:${tit.valorAberto.toString()}`)
      .digest('hex')
      .slice(0, 64);

  const exist = await prisma.cobranca.findUnique({
    where: { idempotencyKey: idem },
    include: { titulo: { include: includeTit } },
  });
  if (exist) {
    return {
      cobranca: serializeCob(exist),
      titulo: serializeTitulo(
        await prisma.titulo.findUniqueOrThrow({
          where: { id: tit.id },
          include: includeTit,
        }),
      ),
      replay: true as const,
    };
  }

  const ativa = tit.cobrancas.find((c) =>
    ['PENDENTE', 'REGISTRADA'].includes(c.status),
  );
  if (ativa) {
    throw new AppError(
      'COB_JA_ATIVA',
      `Já existe ${ativa.codigo} (${ativa.status}) para este TIT — use a mesma idempotencyKey para replay`,
      409,
    );
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: params.empresaId },
  });
  const bank = getBankProvider();
  const codigo = await nextCodigoDocumento(params.empresaId, 'COB');
  const valor = money(new Decimal(tit.valorAberto.toString()));
  const vencimentoEm = tit.vencimentoEm;

  const cob = await prisma.cobranca.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      tituloId: tit.id,
      status: 'PENDENTE',
      valor: moneyToString(valor),
      vencimentoEm,
      adapter: bank.name,
      idempotencyKey: idem,
      criadoPorId: params.usuarioId,
    },
  });

  const result = await bank.emitirCobranca({
    empresaCnpj: empresa.cnpj,
    tituloCodigo: tit.codigo,
    valor: moneyToString(valor),
    vencimentoEm: vencimentoEm.toISOString().slice(0, 10),
    pagador: {
      nome: tit.parceiro.razaoSocial,
      cnpjCpf: tit.parceiro.cnpjCpf,
    },
    idempotencyKey: idem,
  });

  if (!result.ok) {
    await prisma.cobranca.update({
      where: { id: cob.id },
      data: { status: 'CANCELADA', payloadRetorno: { erro: result.mensagem } },
    });
    throw new AppError('BANK_REJEICAO', result.mensagem, 422, { codigo: result.codigo });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.cobranca.update({
      where: { id: cob.id },
      data: {
        status: 'REGISTRADA',
        nossoNumero: result.nossoNumero,
        linhaDigitavel: result.linhaDigitavel,
        pdfRef: result.pdfRef,
        adapter: result.adapter,
        payloadRetorno: result.raw as Prisma.InputJsonValue,
        registradoEm: new Date(),
      },
    });
    if (tit.status === 'ABERTO') {
      await tx.titulo.update({
        where: { id: tit.id },
        data: { status: 'COBRADO' },
      });
    }
    return c;
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'CobrancaRegistrada',
      agregadoTipo: 'cobranca',
      agregadoId: updated.id.toString(),
      payload: { codigo: updated.codigo, tituloCodigo: tit.codigo },
      idempotencyKey: `cob-reg-${updated.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FIN.COB.EMITIR',
    entidade: 'Cobranca',
    entidadeId: updated.codigo,
    paraJson: {
      tituloCodigo: tit.codigo,
      nossoNumero: updated.nossoNumero,
      adapter: updated.adapter,
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    cobranca: serializeCob(updated),
    titulo: serializeTitulo(
      await prisma.titulo.findUniqueOrThrow({
        where: { id: tit.id },
        include: includeTit,
      }),
    ),
    replay: false as const,
  };
}

function serializeCob(c: {
  id: bigint;
  codigo: string;
  status: string;
  valor: Prisma.Decimal;
  nossoNumero: string | null;
  linhaDigitavel: string | null;
  pdfRef: string | null;
  adapter: string;
  vencimentoEm?: Date;
}) {
  return {
    id: c.id.toString(),
    codigo: c.codigo,
    status: c.status,
    valor: moneyToString(new Decimal(c.valor.toString())),
    nossoNumero: c.nossoNumero,
    linhaDigitavel: c.linhaDigitavel,
    pdfRef: c.pdfRef,
    adapter: c.adapter,
    vencimentoEm: c.vencimentoEm
      ? c.vencimentoEm.toISOString().slice(0, 10)
      : undefined,
  };
}

export async function listarCobrancas(params: {
  empresaId: bigint;
  tituloId?: bigint;
  limit?: number;
}) {
  const rows = await prisma.cobranca.findMany({
    where: {
      empresaId: params.empresaId,
      ...(params.tituloId ? { tituloId: params.tituloId } : {}),
    },
    orderBy: { criadoEm: 'desc' },
    take: Math.min(params.limit ?? 50, 100),
    include: { titulo: true },
  });
  return rows.map((c) => ({
    ...serializeCob(c),
    tituloCodigo: c.titulo.codigo,
    tituloId: c.tituloId.toString(),
  }));
}

export async function obterAgingTitulos(empresaId: bigint) {
  await sincronizarTitulosDeNfs(empresaId);
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  const titulos = await prisma.titulo.findMany({
    where: {
      empresaId,
      tipo: 'RECEBER',
      status: { in: ['ABERTO', 'COBRADO', 'PARCIALMENTE_BAIXADO'] },
    },
    select: { valorAberto: true, vencimentoEm: true },
  });

  const buckets = {
    current: money(0),
    d1_30: money(0),
    d31_60: money(0),
    d60_plus: money(0),
  };

  for (const t of titulos) {
    const aberto = money(new Decimal(t.valorAberto.toString()));
    if (aberto.lte(0)) continue;
    const venc = new Date(t.vencimentoEm);
    venc.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000);
    if (diffDays <= 0) buckets.current = money(buckets.current.plus(aberto));
    else if (diffDays <= 30) buckets.d1_30 = money(buckets.d1_30.plus(aberto));
    else if (diffDays <= 60) buckets.d31_60 = money(buckets.d31_60.plus(aberto));
    else buckets.d60_plus = money(buckets.d60_plus.plus(aberto));
  }

  const total = money(
    buckets.current.plus(buckets.d1_30).plus(buckets.d31_60).plus(buckets.d60_plus),
  );

  return {
    buckets: {
      current: moneyToString(buckets.current),
      d1_30: moneyToString(buckets.d1_30),
      d31_60: moneyToString(buckets.d31_60),
      d60_plus: moneyToString(buckets.d60_plus),
    },
    total: moneyToString(total),
    referenciaEm: hoje.toISOString().slice(0, 10),
  };
}

export async function gerarTituloSinal(params: {
  empresaId: bigint;
  pedidoId: bigint;
  valor: string;
  usuarioId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const ped = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: { titulos: { where: { origem: 'SINAL' } } },
  });
  if (!ped) throw new NotFoundError('Pedido não encontrado');
  if (ped.status !== 'AGUARDA_ADIANTAMENTO') {
    throw new AppError('PED_NAO_ADIANTAMENTO', `PED em ${ped.status} não aguarda adiantamento`, 400);
  }
  if (ped.titulos.length > 0) {
    const existing = ped.titulos[0]!;
    const full = await prisma.titulo.findUniqueOrThrow({
      where: { id: existing.id },
      include: includeTit,
    });
    return { titulo: serializeTitulo(full), criado: false as const };
  }

  const natureza = await naturezaPadrao(params.empresaId);
  const valor = money(new Decimal(params.valor));
  const venc = new Date();
  venc.setUTCDate(venc.getUTCDate() + 3);
  const codigo = await nextCodigoDocumento(params.empresaId, 'TIT');

  const created = await prisma.titulo.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      tipo: 'RECEBER',
      status: 'ABERTO',
      origem: 'SINAL',
      pedidoId: ped.id,
      documentoFiscalId: null,
      parceiroId: ped.parceiroId,
      naturezaGerencial: natureza,
      valorOriginal: moneyToString(valor),
      valorAberto: moneyToString(valor),
      valorBaixado: '0.00',
      vencimentoEm: new Date(venc.toISOString().slice(0, 10)),
      observacoes: `Adiantamento/sinal PED ${ped.codigo}`,
    },
    include: includeTit,
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FIN.TIT.SINAL',
    entidade: 'Titulo',
    entidadeId: created.codigo,
    paraJson: { pedidoCodigo: ped.codigo, valor: moneyToString(valor) },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return { titulo: serializeTitulo(created), criado: true as const };
}

export async function processarWebhookBank(params: {
  empresaId: bigint;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  correlationId?: string;
}) {
  const idem = params.idempotencyKey.trim();
  const existEvt = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey: idem },
  });
  if (existEvt) {
    const amb = await prisma.baixaAmbigua.findUnique({ where: { idempotencyKey: idem } });
    return {
      replay: true as const,
      tipo: amb ? ('AMBIGUA' as const) : ('BX' as const),
      baixaAmbiguaId: amb?.id.toString() ?? null,
    };
  }

  await prisma.webhookEvent.create({
    data: {
      provider: 'bank',
      idempotencyKey: idem,
      payload: params.payload as Prisma.InputJsonValue,
      processadoEm: new Date(),
    },
  });

  const nossoNumero = String(params.payload.nossoNumero ?? '').trim();
  const valorStr = String(params.payload.valor ?? '').trim();
  if (!nossoNumero || !valorStr) {
    throw new AppError('WEBHOOK_INCOMPLETO', 'nossoNumero e valor obrigatórios', 400);
  }
  const valor = money(new Decimal(valorStr));

  const cob = await prisma.cobranca.findFirst({
    where: {
      empresaId: params.empresaId,
      nossoNumero,
      status: 'REGISTRADA',
      valor: moneyToString(valor),
    },
    include: { titulo: true },
  });

  if (cob) {
    const bx = await baixarTituloManual({
      empresaId: params.empresaId,
      usuarioId: BigInt(0),
      tituloId: cob.tituloId,
      valor: moneyToString(valor),
      forma: 'WEBHOOK_BANK',
      idempotencyKey: idem,
      observacoes: `Webhook bank ${nossoNumero}`,
      correlationId: params.correlationId,
    });
    return { replay: bx.replay, tipo: 'BX' as const, titulo: bx.titulo };
  }

  const codigo = await nextCodigoDocumento(params.empresaId, 'BAM');
  const amb = await prisma.baixaAmbigua.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      payloadJson: params.payload as Prisma.InputJsonValue,
      status: 'PENDENTE',
      valor: moneyToString(valor),
      idempotencyKey: idem,
    },
  });

  return {
    replay: false as const,
    tipo: 'AMBIGUA' as const,
    baixaAmbigua: {
      id: amb.id.toString(),
      codigo: amb.codigo,
      status: amb.status,
      valor: moneyToString(valor),
    },
  };
}

export async function conciliarBaixaAmbigua(params: {
  empresaId: bigint;
  usuarioId: bigint;
  baixaAmbiguaId: bigint;
  tituloId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const amb = await prisma.baixaAmbigua.findFirst({
    where: { id: params.baixaAmbiguaId, empresaId: params.empresaId },
  });
  if (!amb) throw new NotFoundError('Baixa ambígua não encontrada');
  if (amb.status !== 'PENDENTE') {
    throw new AppError('BAM_STATUS', `Baixa ambígua em ${amb.status}`, 400);
  }

  const valor = money(new Decimal(amb.valor?.toString() ?? '0'));
  const bx = await baixarTituloManual({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    tituloId: params.tituloId,
    valor: moneyToString(valor),
    forma: 'CONCILIACAO_BAM',
    idempotencyKey: `bam-conc-${amb.id}-${params.tituloId}`,
    ip: params.ip,
    correlationId: params.correlationId,
  });

  await prisma.baixaAmbigua.update({
    where: { id: amb.id },
    data: { status: 'CONCILIADA', tituloId: params.tituloId },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FIN.BAM.CONCILIAR',
    entidade: 'BaixaAmbigua',
    entidadeId: amb.codigo,
    paraJson: { tituloCodigo: bx.titulo.codigo },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return { baixaAmbigua: amb.codigo, titulo: bx.titulo };
}
