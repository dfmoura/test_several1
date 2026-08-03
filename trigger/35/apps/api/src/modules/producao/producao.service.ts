import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/client.js';
import { nextCodigoDocumento } from '../cadastros/shared/codigo.service.js';
import { aplicarMovimento } from '../estoque/estoque.service.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { AppError, ConflictError, NotFoundError } from '../shared/errors/app-error.js';
import { Decimal, qty, qtyToString } from '../shared/decimal/money.js';

const PED_OK_PRODUCAO = ['LIBERADO', 'EM_PRODUCAO', 'EM_SEPARACAO'] as const;

function snapshotItem(item: {
  id: bigint;
  sequencia: number;
  produtoId: bigint | null;
  produtoCodigo: string | null;
  descricao: string;
  tipoItem: string;
  quantidade: Prisma.Decimal;
  unidadeCodigo: string;
  precoUnitario: Prisma.Decimal;
  specJson: Prisma.JsonValue | null;
}) {
  return {
    pedidoItemId: item.id.toString(),
    sequencia: item.sequencia,
    produtoId: item.produtoId?.toString() ?? null,
    produtoCodigo: item.produtoCodigo,
    descricao: item.descricao,
    tipoItem: item.tipoItem,
    quantidade: item.quantidade.toString(),
    unidadeCodigo: item.unidadeCodigo,
    precoUnitario: item.precoUnitario.toString(),
    specJson: item.specJson,
  };
}

function serializeOp(
  op: Prisma.OrdemProducaoGetPayload<{
    include: {
      pedido: true;
      pedidoItem: true;
      apontamentos: true;
      movimentosEstoque: { include: { produto: true } };
    };
  }>,
) {
  return {
    tipo: 'OP' as const,
    id: op.id.toString(),
    codigo: op.codigo,
    status: op.status,
    quantidadePlanejada: qtyToString(new Decimal(op.quantidadePlanejada.toString())),
    quantidadeApontada: qtyToString(new Decimal(op.quantidadeApontada.toString())),
    quantidadePaRetornada: qtyToString(new Decimal(op.quantidadePaRetornada.toString())),
    pedido: {
      id: op.pedido.id.toString(),
      codigo: op.pedido.codigo,
      status: op.pedido.status,
    },
    item: {
      id: op.pedidoItem.id.toString(),
      sequencia: op.pedidoItem.sequencia,
      produtoId: op.pedidoItem.produtoId?.toString() ?? null,
      produtoCodigo: op.pedidoItem.produtoCodigo,
      descricao: op.pedidoItem.descricao,
      tipoItem: op.pedidoItem.tipoItem,
      quantidade: op.pedidoItem.quantidade.toString(),
    },
    apontamentos: op.apontamentos.map((a) => ({
      id: a.id.toString(),
      quantidade: qtyToString(new Decimal(a.quantidade.toString())),
      observacao: a.observacao,
      criadoEm: a.criadoEm,
    })),
    movimentos: op.movimentosEstoque.map((m) => ({
      id: m.id.toString(),
      codigo: m.codigo,
      tipo: m.tipo,
      motivo: m.motivo,
      quantidade: qtyToString(new Decimal(m.quantidade.toString())),
      produtoCodigo: m.produto.codigo,
    })),
    iniciadoEm: op.iniciadoEm,
    concluidoEm: op.concluidoEm,
    criadoEm: op.criadoEm,
  };
}

function serializeOs(
  os: Prisma.OrdemServicoGetPayload<{
    include: { pedido: true; pedidoItem: true; apontamentos: true };
  }>,
) {
  return {
    tipo: 'OS' as const,
    id: os.id.toString(),
    codigo: os.codigo,
    status: os.status,
    quantidadePlanejada: qtyToString(new Decimal(os.quantidadePlanejada.toString())),
    quantidadeApontada: qtyToString(new Decimal(os.quantidadeApontada.toString())),
    pedido: {
      id: os.pedido.id.toString(),
      codigo: os.pedido.codigo,
      status: os.pedido.status,
    },
    item: {
      id: os.pedidoItem.id.toString(),
      sequencia: os.pedidoItem.sequencia,
      produtoId: os.pedidoItem.produtoId?.toString() ?? null,
      produtoCodigo: os.pedidoItem.produtoCodigo,
      descricao: os.pedidoItem.descricao,
      tipoItem: os.pedidoItem.tipoItem,
      quantidade: os.pedidoItem.quantidade.toString(),
    },
    apontamentos: os.apontamentos.map((a) => ({
      id: a.id.toString(),
      quantidade: qtyToString(new Decimal(a.quantidade.toString())),
      observacao: a.observacao,
      criadoEm: a.criadoEm,
    })),
    iniciadoEm: os.iniciadoEm,
    concluidoEm: os.concluidoEm,
    criadoEm: os.criadoEm,
  };
}

const includeOp = {
  pedido: true,
  pedidoItem: true,
  apontamentos: { orderBy: { criadoEm: 'asc' as const } },
  movimentosEstoque: { include: { produto: true }, orderBy: { criadoEm: 'asc' as const } },
};

const includeOs = {
  pedido: true,
  pedidoItem: true,
  apontamentos: { orderBy: { criadoEm: 'asc' as const } },
};

export async function listarOrdens(params: {
  empresaId: bigint;
  status?: string;
  limit?: number;
}) {
  const take = Math.min(params.limit ?? 50, 100);
  const [ops, oss] = await Promise.all([
    prisma.ordemProducao.findMany({
      where: {
        empresaId: params.empresaId,
        ...(params.status ? { status: params.status as never } : {}),
      },
      include: includeOp,
      orderBy: { criadoEm: 'desc' },
      take,
    }),
    prisma.ordemServico.findMany({
      where: {
        empresaId: params.empresaId,
        ...(params.status ? { status: params.status as never } : {}),
      },
      include: includeOs,
      orderBy: { criadoEm: 'desc' },
      take,
    }),
  ]);
  return [
    ...ops.map(serializeOp),
    ...oss.map(serializeOs),
  ].sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
}

export async function abrirOp(params: {
  empresaId: bigint;
  usuarioId: bigint;
  pedidoId: bigint;
  pedidoItemId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: { itens: true },
  });
  if (!pedido) throw new NotFoundError('Pedido não encontrado');
  if (!(PED_OK_PRODUCAO as readonly string[]).includes(pedido.status)) {
    throw new AppError(
      'PED_NAO_LIBERADO',
      'OP exige PED LIBERADO (crédito ok)',
      400,
      { status: pedido.status },
    );
  }

  const item = pedido.itens.find((i) => i.id === params.pedidoItemId);
  if (!item) throw new NotFoundError('Item do pedido não encontrado');
  if (item.tipoItem !== 'PRODUCAO') {
    throw new AppError('ITEM_NAO_PRODUCAO', 'OP só nasce de item PRODUCAO', 400);
  }

  const existente = await prisma.ordemProducao.findUnique({
    where: { pedidoItemId: item.id },
  });
  if (existente && existente.status !== 'CANCELADA') {
    throw new ConflictError(`Já existe ${existente.codigo} para este item`, 'OP_JA_EXISTE');
  }

  const codigo = await nextCodigoDocumento(params.empresaId, 'OP');
  const created = await prisma.$transaction(async (tx) => {
    const op = await tx.ordemProducao.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        pedidoId: pedido.id,
        pedidoItemId: item.id,
        status: 'ABERTA',
        quantidadePlanejada: item.quantidade,
        snapshotJson: snapshotItem(item) as unknown as Prisma.InputJsonValue,
        criadoPorId: params.usuarioId,
      },
      include: includeOp,
    });
    if (pedido.status === 'LIBERADO') {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { status: 'EM_PRODUCAO' },
      });
    }
    return op;
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'OpAberta',
      agregadoTipo: 'ordem_producao',
      agregadoId: created.id.toString(),
      payload: { codigo: created.codigo, pedidoCodigo: pedido.codigo },
      idempotencyKey: `op-open-${item.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OP.ABRIR',
    entidade: 'OrdemProducao',
    entidadeId: created.codigo,
    paraJson: { codigo: created.codigo, pedidoCodigo: pedido.codigo },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOp(
    await prisma.ordemProducao.findUniqueOrThrow({
      where: { id: created.id },
      include: includeOp,
    }),
  );
}

export async function abrirOs(params: {
  empresaId: bigint;
  usuarioId: bigint;
  pedidoId: bigint;
  pedidoItemId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: { itens: true },
  });
  if (!pedido) throw new NotFoundError('Pedido não encontrado');
  if (!(PED_OK_PRODUCAO as readonly string[]).includes(pedido.status)) {
    throw new AppError(
      'PED_NAO_LIBERADO',
      'OS exige PED LIBERADO (crédito ok)',
      400,
      { status: pedido.status },
    );
  }

  const item = pedido.itens.find((i) => i.id === params.pedidoItemId);
  if (!item) throw new NotFoundError('Item do pedido não encontrado');
  if (item.tipoItem !== 'SERVICO') {
    throw new AppError('ITEM_NAO_SERVICO', 'OS só nasce de item SERVICO', 400);
  }

  const existente = await prisma.ordemServico.findUnique({
    where: { pedidoItemId: item.id },
  });
  if (existente && existente.status !== 'CANCELADA') {
    throw new ConflictError(`Já existe ${existente.codigo} para este item`, 'OS_JA_EXISTE');
  }

  const codigo = await nextCodigoDocumento(params.empresaId, 'OS');
  const created = await prisma.$transaction(async (tx) => {
    const os = await tx.ordemServico.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        pedidoId: pedido.id,
        pedidoItemId: item.id,
        status: 'ABERTA',
        quantidadePlanejada: item.quantidade,
        snapshotJson: snapshotItem(item) as unknown as Prisma.InputJsonValue,
        criadoPorId: params.usuarioId,
      },
      include: includeOs,
    });
    if (pedido.status === 'LIBERADO') {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { status: 'EM_PRODUCAO' },
      });
    }
    return os;
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'OsAberta',
      agregadoTipo: 'ordem_servico',
      agregadoId: created.id.toString(),
      payload: { codigo: created.codigo, pedidoCodigo: pedido.codigo },
      idempotencyKey: `os-open-${item.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OS.ABRIR',
    entidade: 'OrdemServico',
    entidadeId: created.codigo,
    paraJson: { codigo: created.codigo, pedidoCodigo: pedido.codigo },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOs(
    await prisma.ordemServico.findUniqueOrThrow({
      where: { id: created.id },
      include: includeOs,
    }),
  );
}

async function assertOrdemAberta(status: string) {
  if (!['ABERTA', 'EM_ANDAMENTO'].includes(status)) {
    throw new AppError('ORDEM_FECHADA', `Ordem em ${status} não aceita apontamento`, 400);
  }
}

export async function apontarOp(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemId: bigint;
  quantidade: string;
  observacao?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const op = await prisma.ordemProducao.findFirst({
    where: { id: params.ordemId, empresaId: params.empresaId },
  });
  if (!op) throw new NotFoundError('OP não encontrada');
  await assertOrdemAberta(op.status);

  const qtde = qty(new Decimal(params.quantidade));
  if (qtde.lte(0)) throw new AppError('QTDE_INVALIDA', 'Quantidade deve ser > 0', 400);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.apontamentoOrdem.create({
      data: {
        ordemProducaoId: op.id,
        quantidade: qtde.toFixed(4),
        observacao: params.observacao ?? null,
        criadoPorId: params.usuarioId,
      },
    });
    return tx.ordemProducao.update({
      where: { id: op.id },
      data: {
        quantidadeApontada: qty(
          new Decimal(op.quantidadeApontada.toString()).plus(qtde),
        ).toFixed(4),
        status: 'EM_ANDAMENTO',
        iniciadoEm: op.iniciadoEm ?? new Date(),
      },
      include: includeOp,
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OP.APONTAR',
    entidade: 'OrdemProducao',
    entidadeId: op.codigo,
    paraJson: { quantidade: qtde.toFixed(4) },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOp(updated);
}

export async function apontarOs(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemId: bigint;
  quantidade: string;
  observacao?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const os = await prisma.ordemServico.findFirst({
    where: { id: params.ordemId, empresaId: params.empresaId },
  });
  if (!os) throw new NotFoundError('OS não encontrada');
  await assertOrdemAberta(os.status);

  const qtde = qty(new Decimal(params.quantidade));
  if (qtde.lte(0)) throw new AppError('QTDE_INVALIDA', 'Quantidade deve ser > 0', 400);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.apontamentoOrdem.create({
      data: {
        ordemServicoId: os.id,
        quantidade: qtde.toFixed(4),
        observacao: params.observacao ?? null,
        criadoPorId: params.usuarioId,
      },
    });
    return tx.ordemServico.update({
      where: { id: os.id },
      data: {
        quantidadeApontada: qty(
          new Decimal(os.quantidadeApontada.toString()).plus(qtde),
        ).toFixed(4),
        status: 'EM_ANDAMENTO',
        iniciadoEm: os.iniciadoEm ?? new Date(),
      },
      include: includeOs,
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OS.APONTAR',
    entidade: 'OrdemServico',
    entidadeId: os.codigo,
    paraJson: { quantidade: qtde.toFixed(4) },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOs(updated);
}

export async function consumirMpOp(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemId: bigint;
  produtoId: bigint;
  quantidade: string;
  ip?: string;
  correlationId?: string;
}) {
  const op = await prisma.ordemProducao.findFirst({
    where: { id: params.ordemId, empresaId: params.empresaId },
    include: { pedidoItem: true },
  });
  if (!op) throw new NotFoundError('OP não encontrada');
  await assertOrdemAberta(op.status);

  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, empresaId: params.empresaId },
  });
  if (!produto) throw new NotFoundError('Produto MP não encontrado');
  if (produto.familia !== 'MP' && produto.familia !== 'EMB') {
    throw new AppError(
      'PRODUTO_NAO_MP',
      'Consumo na OP deve ser família MP ou EMB',
      400,
      { familia: produto.familia },
    );
  }

  const qtde = qty(new Decimal(params.quantidade));
  const mov = await prisma.$transaction(async (tx) => {
    const created = await aplicarMovimento(tx, {
      empresaId: params.empresaId,
      produtoId: produto.id,
      tipo: 'SAIDA',
      motivo: 'CONSUMO_OP',
      quantidade: qtde,
      custoUnitario: new Decimal(0),
      pedidoId: op.pedidoId,
      pedidoItemId: op.pedidoItemId,
      ordemProducaoId: op.id,
      motivoTexto: `Consumo ${op.codigo}`,
      criadoPorId: params.usuarioId,
    });
    if (op.status === 'ABERTA') {
      await tx.ordemProducao.update({
        where: { id: op.id },
        data: { status: 'EM_ANDAMENTO', iniciadoEm: op.iniciadoEm ?? new Date() },
      });
    }
    return created;
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OP.CONSUMO_MP',
    entidade: 'OrdemProducao',
    entidadeId: op.codigo,
    paraJson: {
      mov: mov.codigo,
      produtoCodigo: produto.codigo,
      quantidade: qtde.toFixed(4),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOp(
    await prisma.ordemProducao.findUniqueOrThrow({
      where: { id: op.id },
      include: includeOp,
    }),
  );
}

export async function retornarPaOp(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemId: bigint;
  quantidade: string;
  custoUnitario?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const op = await prisma.ordemProducao.findFirst({
    where: { id: params.ordemId, empresaId: params.empresaId },
    include: { pedidoItem: true },
  });
  if (!op) throw new NotFoundError('OP não encontrada');
  await assertOrdemAberta(op.status);

  const produtoId = op.pedidoItem.produtoId;
  if (!produtoId) {
    throw new AppError('ITEM_SEM_SKU', 'Item OP sem produto PA', 400);
  }
  const produto = await prisma.produto.findFirst({
    where: { id: produtoId, empresaId: params.empresaId },
  });
  if (!produto) throw new NotFoundError('Produto PA não encontrado');

  const qtde = qty(new Decimal(params.quantidade));
  const custo = new Decimal(params.custoUnitario ?? '0');

  await prisma.$transaction(async (tx) => {
    await aplicarMovimento(tx, {
      empresaId: params.empresaId,
      produtoId: produto.id,
      tipo: 'ENTRADA',
      motivo: 'RETORNO_PA',
      quantidade: qtde,
      custoUnitario: custo,
      pedidoId: op.pedidoId,
      pedidoItemId: op.pedidoItemId,
      ordemProducaoId: op.id,
      motivoTexto: `Retorno PA ${op.codigo}`,
      criadoPorId: params.usuarioId,
    });
    await tx.ordemProducao.update({
      where: { id: op.id },
      data: {
        quantidadePaRetornada: qty(
          new Decimal(op.quantidadePaRetornada.toString()).plus(qtde),
        ).toFixed(4),
        status: 'EM_ANDAMENTO',
        iniciadoEm: op.iniciadoEm ?? new Date(),
      },
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OP.RETORNO_PA',
    entidade: 'OrdemProducao',
    entidadeId: op.codigo,
    paraJson: { produtoCodigo: produto.codigo, quantidade: qtde.toFixed(4) },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOp(
    await prisma.ordemProducao.findUniqueOrThrow({
      where: { id: op.id },
      include: includeOp,
    }),
  );
}

export async function concluirOp(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const op = await prisma.ordemProducao.findFirst({
    where: { id: params.ordemId, empresaId: params.empresaId },
    include: { movimentosEstoque: true, apontamentos: true },
  });
  if (!op) throw new NotFoundError('OP não encontrada');
  await assertOrdemAberta(op.status);

  const apontada = new Decimal(op.quantidadeApontada.toString());
  const pa = new Decimal(op.quantidadePaRetornada.toString());
  const temConsumo = op.movimentosEstoque.some((m) => m.motivo === 'CONSUMO_OP');

  if (apontada.lte(0)) {
    throw new AppError('OP_SEM_APONTAMENTO', 'Conclusão exige apontamento', 400);
  }
  if (!temConsumo) {
    throw new AppError('OP_SEM_CONSUMO', 'Conclusão exige consumo de MP (MOV)', 400);
  }
  if (pa.lte(0)) {
    throw new AppError('OP_SEM_RETORNO_PA', 'Conclusão exige retorno de PA ao estoque', 400);
  }

  const updated = await prisma.ordemProducao.update({
    where: { id: op.id },
    data: { status: 'CONCLUIDA', concluidoEm: new Date() },
    include: includeOp,
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'OpConcluida',
      agregadoTipo: 'ordem_producao',
      agregadoId: op.id.toString(),
      payload: { codigo: op.codigo },
      idempotencyKey: `op-done-${op.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OP.CONCLUIR',
    entidade: 'OrdemProducao',
    entidadeId: op.codigo,
    deJson: { status: op.status },
    paraJson: { status: 'CONCLUIDA' },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOp(updated);
}

export async function concluirOs(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const os = await prisma.ordemServico.findFirst({
    where: { id: params.ordemId, empresaId: params.empresaId },
  });
  if (!os) throw new NotFoundError('OS não encontrada');
  await assertOrdemAberta(os.status);

  if (new Decimal(os.quantidadeApontada.toString()).lte(0)) {
    throw new AppError('OS_SEM_APONTAMENTO', 'Conclusão exige apontamento', 400);
  }

  const updated = await prisma.ordemServico.update({
    where: { id: os.id },
    data: { status: 'CONCLUIDA', concluidoEm: new Date() },
    include: includeOs,
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'OsConcluida',
      agregadoTipo: 'ordem_servico',
      agregadoId: os.id.toString(),
      payload: { codigo: os.codigo },
      idempotencyKey: `os-done-${os.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRD.OS.CONCLUIR',
    entidade: 'OrdemServico',
    entidadeId: os.codigo,
    deJson: { status: os.status },
    paraJson: { status: 'CONCLUIDA' },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOs(updated);
}
