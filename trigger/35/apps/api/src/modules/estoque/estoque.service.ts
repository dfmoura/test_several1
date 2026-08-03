import type { MotivoMovimentoEstoque, Prisma, TipoMovimentoEstoque } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma/client.js';
import { nextCodigoDocumento } from '../cadastros/shared/codigo.service.js';
import { ForbiddenError } from '../shared/errors/app-error.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { AppError, NotFoundError } from '../shared/errors/app-error.js';
import { Decimal, qty, qtyToString } from '../shared/decimal/money.js';

type Tx = Prisma.TransactionClient;

function serializeMov(
  m: Prisma.MovimentoEstoqueGetPayload<{ include: { produto: true } }>,
) {
  return {
    id: m.id.toString(),
    codigo: m.codigo,
    tipo: m.tipo,
    motivo: m.motivo,
    quantidade: qtyToString(new Decimal(m.quantidade.toString())),
    custoUnitario: new Decimal(m.custoUnitario.toString()).toFixed(4),
    custoTotal: new Decimal(m.custoTotal.toString()).toFixed(4),
    saldoApos: qtyToString(new Decimal(m.saldoApos.toString())),
    custoMedioApos: new Decimal(m.custoMedioApos.toString()).toFixed(4),
    motivoTexto: m.motivoTexto,
    pedidoId: m.pedidoId?.toString() ?? null,
    pedidoItemId: m.pedidoItemId?.toString() ?? null,
    criadoEm: m.criadoEm,
    produto: {
      id: m.produto.id.toString(),
      codigo: m.produto.codigo,
      descricao: m.produto.descricao,
      familia: m.produto.familia,
    },
  };
}

function serializeSaldo(
  s: Prisma.SaldoEstoqueGetPayload<{
    include: { produto: { include: { unidadeEstoque: true } } };
  }>,
) {
  return {
    id: s.id.toString(),
    quantidade: qtyToString(new Decimal(s.quantidade.toString())),
    custoMedio: new Decimal(s.custoMedio.toString()).toFixed(4),
    atualizadoEm: s.atualizadoEm,
    produto: {
      id: s.produto.id.toString(),
      codigo: s.produto.codigo,
      descricao: s.produto.descricao,
      familia: s.produto.familia,
      controlaEstoque: s.produto.controlaEstoque,
      unidadeEstoque: {
        id: s.produto.unidadeEstoque.id.toString(),
        codigo: s.produto.unidadeEstoque.codigo,
      },
    },
  };
}

async function assertEmpresaEstoqueAtivo(empresaId: bigint) {
  const emp = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!emp) throw new NotFoundError('Empresa não encontrada');
  if (!emp.estoqueAtivo) {
    throw new AppError(
      'ESTOQUE_INATIVO',
      `Empresa ${emp.codigo} sem estoque ativo`,
      400,
    );
  }
  return emp;
}

async function lockSaldo(tx: Tx, empresaId: bigint, produtoId: bigint) {
  const rows = await tx.$queryRaw<
    Array<{ id: bigint; quantidade: Prisma.Decimal; custo_medio: Prisma.Decimal }>
  >`
    SELECT id, quantidade, custo_medio
    FROM saldo_estoque
    WHERE empresa_id = ${empresaId} AND produto_id = ${produtoId}
    FOR UPDATE
  `;
  if (rows[0]) {
    return {
      id: rows[0].id,
      quantidade: new Decimal(rows[0].quantidade.toString()),
      custoMedio: new Decimal(rows[0].custo_medio.toString()),
    };
  }
  const created = await tx.saldoEstoque.create({
    data: {
      empresaId,
      produtoId,
      quantidade: '0',
      custoMedio: '0',
    },
  });
  return {
    id: created.id,
    quantidade: new Decimal(0),
    custoMedio: new Decimal(0),
  };
}

export async function aplicarMovimento(
  tx: Tx,
  params: {
    empresaId: bigint;
    produtoId: bigint;
    tipo: TipoMovimentoEstoque;
    motivo: MotivoMovimentoEstoque;
    quantidade: Decimal;
    custoUnitario: Decimal;
    pedidoId?: bigint | null;
    pedidoItemId?: bigint | null;
    ordemProducaoId?: bigint | null;
    motivoTexto?: string | null;
    criadoPorId?: bigint | null;
  },
) {
  const qtde = qty(params.quantidade);
  if (qtde.lte(0)) {
    throw new AppError('QTDE_INVALIDA', 'Quantidade deve ser > 0', 400);
  }

  const saldo = await lockSaldo(tx, params.empresaId, params.produtoId);
  let novaQtde: Decimal;
  let novoCustoMedio: Decimal;
  let custoUnit: Decimal;

  if (params.tipo === 'ENTRADA') {
    custoUnit = qty(params.custoUnitario, 4);
    if (custoUnit.isNegative()) {
      throw new AppError('CUSTO_INVALIDO', 'Custo unitário não pode ser negativo', 400);
    }
    const valorAtual = saldo.quantidade.mul(saldo.custoMedio);
    const valorEntrada = qtde.mul(custoUnit);
    novaQtde = qty(saldo.quantidade.plus(qtde));
    novoCustoMedio =
      novaQtde.isZero()
        ? new Decimal(0)
        : qty(valorAtual.plus(valorEntrada).div(novaQtde), 4);
  } else {
    if (saldo.quantidade.lt(qtde)) {
      throw new AppError(
        'SALDO_INSUFICIENTE',
        `Saldo insuficiente: disponível ${qtyToString(saldo.quantidade)}, pedido ${qtyToString(qtde)}`,
        409,
        {
          disponivel: qtyToString(saldo.quantidade),
          solicitado: qtyToString(qtde),
        },
      );
    }
    custoUnit = saldo.custoMedio;
    novaQtde = qty(saldo.quantidade.minus(qtde));
    novoCustoMedio = novaQtde.isZero() ? new Decimal(0) : saldo.custoMedio;
  }

  const custoTotal = qty(qtde.mul(custoUnit), 4);
  const codigo = await nextCodigoDocumento(params.empresaId, 'MOV', tx);

  const mov = await tx.movimentoEstoque.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      produtoId: params.produtoId,
      tipo: params.tipo,
      motivo: params.motivo,
      quantidade: qtde.toFixed(4),
      custoUnitario: custoUnit.toFixed(4),
      custoTotal: custoTotal.toFixed(4),
      saldoApos: novaQtde.toFixed(4),
      custoMedioApos: novoCustoMedio.toFixed(4),
      pedidoId: params.pedidoId ?? null,
      pedidoItemId: params.pedidoItemId ?? null,
      ordemProducaoId: params.ordemProducaoId ?? null,
      motivoTexto: params.motivoTexto ?? null,
      criadoPorId: params.criadoPorId ?? null,
    },
    include: { produto: true },
  });

  await tx.saldoEstoque.update({
    where: { id: saldo.id },
    data: {
      quantidade: novaQtde.toFixed(4),
      custoMedio: novoCustoMedio.toFixed(4),
    },
  });

  return mov;
}

export async function listarSaldos(params: {
  empresaId: bigint;
  q?: string;
  family?: string;
  limit?: number;
}) {
  await assertEmpresaEstoqueAtivo(params.empresaId);
  const items = await prisma.saldoEstoque.findMany({
    where: {
      empresaId: params.empresaId,
      ...(params.q || params.family
        ? {
            produto: {
              ...(params.family
                ? { familia: params.family as 'MP' | 'EMB' | 'REV' | 'PA' | 'SVC' }
                : {}),
              ...(params.q
                ? {
                    OR: [
                      { codigo: { contains: params.q, mode: 'insensitive' } },
                      { descricao: { contains: params.q, mode: 'insensitive' } },
                    ],
                  }
                : {}),
            },
          }
        : {}),
    },
    include: { produto: { include: { unidadeEstoque: true } } },
    orderBy: { produto: { codigo: 'asc' } },
    take: Math.min(params.limit ?? 100, 200),
  });
  return items.map(serializeSaldo);
}

export async function listarMovimentos(params: {
  empresaId: bigint;
  produtoId?: bigint;
  limit?: number;
}) {
  await assertEmpresaEstoqueAtivo(params.empresaId);
  const items = await prisma.movimentoEstoque.findMany({
    where: {
      empresaId: params.empresaId,
      ...(params.produtoId ? { produtoId: params.produtoId } : {}),
    },
    include: { produto: true },
    orderBy: { criadoEm: 'desc' },
    take: Math.min(params.limit ?? 50, 200),
  });
  return items.map(serializeMov);
}

export async function lancarAjuste(params: {
  empresaId: bigint;
  usuarioId: bigint;
  tipo: TipoMovimentoEstoque;
  produtoId: bigint;
  quantidade: string;
  custoUnitario?: string | null;
  motivoTexto?: string | null;
  entradaInicial?: boolean;
  permissoes?: string[];
  ip?: string;
  correlationId?: string;
}) {
  await assertEmpresaEstoqueAtivo(params.empresaId);

  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, empresaId: params.empresaId },
  });
  if (!produto) throw new NotFoundError('Produto não encontrado');
  if (!produto.controlaEstoque || produto.familia === 'SVC') {
    throw new AppError(
      'PRODUTO_SEM_ESTOQUE',
      'Produto não controla estoque',
      400,
    );
  }

  const motivo: MotivoMovimentoEstoque = params.entradaInicial
    ? 'ENTRADA_INICIAL'
    : 'AJUSTE_INVENTARIO';

  if (!params.entradaInicial && motivo === 'AJUSTE_INVENTARIO') {
    const perms = params.permissoes ?? [];
    if (!perms.includes('est.inventario.aprovar') && !perms.includes('plt.usuario.gerir')) {
      throw new ForbiddenError(
        'AJUSTE_INVENTARIO exige permissão est.inventario.aprovar (SoD)',
        'SEM_PERMISSAO_AJU',
      );
    }
  }

  const custoInformado =
    params.tipo === 'ENTRADA'
      ? new Decimal(params.custoUnitario ?? '0')
      : new Decimal(0);

  const mov = await prisma.$transaction(async (tx) =>
    aplicarMovimento(tx, {
      empresaId: params.empresaId,
      produtoId: params.produtoId,
      tipo: params.tipo,
      motivo,
      quantidade: new Decimal(params.quantidade),
      custoUnitario: custoInformado,
      motivoTexto: params.motivoTexto ?? null,
      criadoPorId: params.usuarioId,
    }),
  );

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: params.tipo === 'ENTRADA' ? 'EST.MOV.ENTRADA' : 'EST.MOV.SAIDA',
    entidade: 'MovimentoEstoque',
    entidadeId: mov.codigo,
    paraJson: {
      codigo: mov.codigo,
      tipo: mov.tipo,
      motivo: mov.motivo,
      produtoCodigo: produto.codigo,
      quantidade: mov.quantidade.toString(),
      saldoApos: mov.saldoApos.toString(),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeMov(mov);
}

export async function separarItemPedido(params: {
  empresaId: bigint;
  usuarioId: bigint;
  pedidoId: bigint;
  pedidoItemId: bigint;
  quantidade?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  await assertEmpresaEstoqueAtivo(params.empresaId);

  const pedido = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: { itens: true },
  });
  if (!pedido) throw new NotFoundError('Pedido não encontrado');
  if (!['LIBERADO', 'EM_SEPARACAO'].includes(pedido.status)) {
    throw new AppError(
      'PED_NAO_LIBERADO',
      'Separação exige PED LIBERADO (ou já EM_SEPARACAO)',
      400,
      { status: pedido.status },
    );
  }

  const item = pedido.itens.find((i) => i.id === params.pedidoItemId);
  if (!item) throw new NotFoundError('Item do pedido não encontrado');
  if (item.tipoItem !== 'REVENDA') {
    throw new AppError(
      'ITEM_NAO_REVENDA',
      'Separação direta só para REVENDA — item PRODUCAO usa OP (M03)',
      400,
      { tipoItem: item.tipoItem },
    );
  }
  if (!item.produtoId) {
    throw new AppError('ITEM_SEM_SKU', 'Item sem produto/SKU vinculado', 400);
  }

  const produto = await prisma.produto.findFirst({
    where: { id: item.produtoId, empresaId: params.empresaId },
  });
  if (!produto) throw new NotFoundError('Produto do item não encontrado');
  if (!produto.controlaEstoque) {
    throw new AppError('PRODUTO_SEM_ESTOQUE', 'SKU não controla estoque', 400);
  }

  const jaSeparadoAgg = await prisma.movimentoEstoque.aggregate({
    where: {
      empresaId: params.empresaId,
      pedidoItemId: item.id,
      tipo: 'SAIDA',
      motivo: 'SEPARACAO_PEDIDO',
    },
    _sum: { quantidade: true },
  });
  const jaSeparado = new Decimal(jaSeparadoAgg._sum.quantidade?.toString() ?? '0');
  const qtdeItem = new Decimal(item.quantidade.toString());
  const restante = qty(qtdeItem.minus(jaSeparado));
  if (restante.lte(0)) {
    throw new AppError('ITEM_JA_SEPARADO', 'Item já totalmente separado', 409);
  }

  const qtdeSep = params.quantidade
    ? qty(new Decimal(params.quantidade))
    : restante;
  if (qtdeSep.gt(restante)) {
    throw new AppError(
      'QTDE_EXCEDE_ITEM',
      `Quantidade excede restante do item (${qtyToString(restante)})`,
      400,
    );
  }

  const mov = await prisma.$transaction(async (tx) => {
    const created = await aplicarMovimento(tx, {
      empresaId: params.empresaId,
      produtoId: item.produtoId!,
      tipo: 'SAIDA',
      motivo: 'SEPARACAO_PEDIDO',
      quantidade: qtdeSep,
      custoUnitario: new Decimal(0),
      pedidoId: pedido.id,
      pedidoItemId: item.id,
      motivoTexto: `Separação ${pedido.codigo} seq ${item.sequencia}`,
      criadoPorId: params.usuarioId,
    });

    if (pedido.status === 'LIBERADO') {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { status: 'EM_SEPARACAO' },
      });
    }

    return created;
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'EST.MOV.SEPARACAO',
    entidade: 'MovimentoEstoque',
    entidadeId: mov.codigo,
    deJson: { pedidoStatus: pedido.status },
    paraJson: {
      codigo: mov.codigo,
      pedidoCodigo: pedido.codigo,
      pedidoItemId: item.id.toString(),
      produtoCodigo: produto.codigo,
      quantidade: mov.quantidade.toString(),
      saldoApos: mov.saldoApos.toString(),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    movimento: serializeMov(mov),
    pedidoCodigo: pedido.codigo,
    pedidoStatus: pedido.status === 'LIBERADO' ? 'EM_SEPARACAO' : pedido.status,
    quantidadeSeparadaAgora: qtyToString(qtdeSep),
    quantidadeRestanteItem: qtyToString(restante.minus(qtdeSep)),
  };
}

export async function obterSaldoProduto(empresaId: bigint, produtoId: bigint) {
  await assertEmpresaEstoqueAtivo(empresaId);
  const saldo = await prisma.saldoEstoque.findUnique({
    where: {
      empresaId_produtoId: { empresaId, produtoId },
    },
    include: { produto: { include: { unidadeEstoque: true } } },
  });
  if (!saldo) {
    const produto = await prisma.produto.findFirst({
      where: { id: produtoId, empresaId },
      include: { unidadeEstoque: true },
    });
    if (!produto) throw new NotFoundError('Produto não encontrado');
    return {
      id: null,
      quantidade: '0.0000',
      custoMedio: '0.0000',
      atualizadoEm: null,
      produto: {
        id: produto.id.toString(),
        codigo: produto.codigo,
        descricao: produto.descricao,
        familia: produto.familia,
        controlaEstoque: produto.controlaEstoque,
        unidadeEstoque: {
          id: produto.unidadeEstoque.id.toString(),
          codigo: produto.unidadeEstoque.codigo,
        },
      },
    };
  }
  return serializeSaldo(saldo);
}

function serializeInventario(
  inv: Prisma.InventarioGetPayload<{
    include: { itens: { include: { produto: true } } };
  }>,
) {
  return {
    id: inv.id.toString(),
    codigo: inv.codigo,
    status: inv.status,
    criadoPorId: inv.criadoPorId.toString(),
    aprovadoPorId: inv.aprovadoPorId?.toString() ?? null,
    criadoEm: inv.criadoEm,
    atualizadoEm: inv.atualizadoEm,
    itens: inv.itens.map((i) => ({
      produtoId: i.produtoId.toString(),
      produtoCodigo: i.produto.codigo,
      descricao: i.produto.descricao,
      qtdeSistema: qtyToString(new Decimal(i.qtdeSistema.toString())),
      qtdeContada: i.qtdeContada ? qtyToString(new Decimal(i.qtdeContada.toString())) : null,
      diferenca: i.diferenca ? qtyToString(new Decimal(i.diferenca.toString())) : null,
    })),
  };
}

export async function listarInventarios(params: { empresaId: bigint; limit?: number }) {
  await assertEmpresaEstoqueAtivo(params.empresaId);
  const rows = await prisma.inventario.findMany({
    where: { empresaId: params.empresaId },
    include: { itens: { include: { produto: true } } },
    orderBy: { criadoEm: 'desc' },
    take: Math.min(params.limit ?? 30, 100),
  });
  return rows.map(serializeInventario);
}

export async function abrirInventario(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  await assertEmpresaEstoqueAtivo(params.empresaId);

  const aberto = await prisma.inventario.findFirst({
    where: {
      empresaId: params.empresaId,
      status: { in: ['ABERTO', 'EM_CONTAGEM', 'AGUARDA_APROVACAO'] },
    },
  });
  if (aberto) {
    throw new AppError(
      'INV_ABERTO_EXISTENTE',
      `Já existe inventário ${aberto.codigo} em ${aberto.status}`,
      409,
    );
  }

  const saldos = await prisma.saldoEstoque.findMany({
    where: {
      empresaId: params.empresaId,
      produto: { controlaEstoque: true, familia: { not: 'SVC' } },
    },
    include: { produto: true },
  });

  const codigo = await nextCodigoDocumento(params.empresaId, 'INV');
  const inv = await prisma.inventario.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      status: 'ABERTO',
      criadoPorId: params.usuarioId,
      itens: {
        create: saldos.map((s) => ({
          produtoId: s.produtoId,
          qtdeSistema: s.quantidade,
        })),
      },
    },
    include: { itens: { include: { produto: true } } },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'EST.INV.ABRIR',
    entidade: 'Inventario',
    entidadeId: inv.codigo,
    paraJson: { itens: inv.itens.length },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeInventario(inv);
}

export async function registrarContagensInventario(params: {
  empresaId: bigint;
  usuarioId: bigint;
  inventarioId: bigint;
  itens: Array<{ produtoId: string; qtdeContada: string }>;
  ip?: string;
  correlationId?: string;
}) {
  await assertEmpresaEstoqueAtivo(params.empresaId);
  const inv = await prisma.inventario.findFirst({
    where: { id: params.inventarioId, empresaId: params.empresaId },
    include: { itens: true },
  });
  if (!inv) throw new NotFoundError('Inventário não encontrado');
  if (!['ABERTO', 'EM_CONTAGEM'].includes(inv.status)) {
    throw new AppError('INV_STATUS', `Inventário em ${inv.status} não aceita contagens`, 400);
  }

  for (const row of params.itens) {
    const produtoId = BigInt(row.produtoId);
    const item = inv.itens.find((i) => i.produtoId === produtoId);
    if (!item) throw new NotFoundError(`Produto ${row.produtoId} não está no inventário`);
    const contada = qty(new Decimal(row.qtdeContada));
    const sistema = qty(new Decimal(item.qtdeSistema.toString()));
    const diff = qty(contada.minus(sistema));
    await prisma.inventarioItem.update({
      where: {
        inventarioId_produtoId: { inventarioId: inv.id, produtoId },
      },
      data: { qtdeContada: contada.toFixed(4), diferenca: diff.toFixed(4) },
    });
  }

  const updated = await prisma.inventario.update({
    where: { id: inv.id },
    data: { status: 'EM_CONTAGEM' },
    include: { itens: { include: { produto: true } } },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'EST.INV.CONTAGEM',
    entidade: 'Inventario',
    entidadeId: updated.codigo,
    paraJson: { itensInformados: params.itens.length },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeInventario(updated);
}

export async function submeterInventario(params: {
  empresaId: bigint;
  usuarioId: bigint;
  inventarioId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  const inv = await prisma.inventario.findFirst({
    where: { id: params.inventarioId, empresaId: params.empresaId },
    include: { itens: { include: { produto: true } } },
  });
  if (!inv) throw new NotFoundError('Inventário não encontrado');
  if (!['ABERTO', 'EM_CONTAGEM'].includes(inv.status)) {
    throw new AppError('INV_STATUS', `Inventário em ${inv.status} não pode submeter`, 400);
  }
  const semContagem = inv.itens.filter((i) => i.qtdeContada === null);
  if (semContagem.length > 0) {
    throw new AppError(
      'INV_CONTAGEM_INCOMPLETA',
      `${semContagem.length} item(ns) sem qtde contada`,
      400,
    );
  }

  const updated = await prisma.inventario.update({
    where: { id: inv.id },
    data: { status: 'AGUARDA_APROVACAO' },
    include: { itens: { include: { produto: true } } },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'EST.INV.SUBMETER',
    entidade: 'Inventario',
    entidadeId: updated.codigo,
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeInventario(updated);
}

export async function aprovarInventario(params: {
  empresaId: bigint;
  usuarioId: bigint;
  inventarioId: bigint;
  permissoes: string[];
  ip?: string;
  correlationId?: string;
}) {
  if (
    !params.permissoes.includes('est.inventario.aprovar') &&
    !params.permissoes.includes('plt.usuario.gerir')
  ) {
    throw new ForbiddenError('Aprovação exige est.inventario.aprovar', 'SEM_PERMISSAO_APROVAR_INV');
  }

  const inv = await prisma.inventario.findFirst({
    where: { id: params.inventarioId, empresaId: params.empresaId },
    include: { itens: { include: { produto: true } } },
  });
  if (!inv) throw new NotFoundError('Inventário não encontrado');
  if (inv.status !== 'AGUARDA_APROVACAO') {
    throw new AppError('INV_STATUS', `Inventário em ${inv.status} não aguarda aprovação`, 400);
  }
  if (inv.criadoPorId === params.usuarioId) {
    throw new AppError(
      'SOD_INVENTARIO',
      'Aprovador não pode ser o mesmo usuário que abriu o inventário (SoD)',
      403,
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const item of inv.itens) {
      const contada = qty(new Decimal(item.qtdeContada!.toString()));
      const sistema = qty(new Decimal(item.qtdeSistema.toString()));
      const diff = qty(contada.minus(sistema));
      if (diff.isZero()) continue;

      const tipo = diff.gt(0) ? 'ENTRADA' : 'SAIDA';
      const qtde = qty(diff.abs());
      const saldo = await lockSaldo(tx, params.empresaId, item.produtoId);
      await aplicarMovimento(tx, {
        empresaId: params.empresaId,
        produtoId: item.produtoId,
        tipo,
        motivo: 'AJUSTE_INVENTARIO',
        quantidade: qtde,
        custoUnitario: saldo.custoMedio,
        motivoTexto: `Inventário ${inv.codigo}`,
        criadoPorId: params.usuarioId,
      });
    }

    await tx.inventario.update({
      where: { id: inv.id },
      data: {
        status: 'APROVADO',
        aprovadoPorId: params.usuarioId,
      },
    });
  });

  const updated = await prisma.inventario.findUniqueOrThrow({
    where: { id: inv.id },
    include: { itens: { include: { produto: true } } },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'EST.INV.APROVAR',
    entidade: 'Inventario',
    entidadeId: updated.codigo,
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeInventario(updated);
}

export async function registrarSobraOp(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemProducaoId: bigint;
  produtoId: bigint;
  quantidade: string;
  ip?: string;
  correlationId?: string;
}) {
  await assertEmpresaEstoqueAtivo(params.empresaId);

  const op = await prisma.ordemProducao.findFirst({
    where: { id: params.ordemProducaoId, empresaId: params.empresaId },
    include: { movimentosEstoque: { include: { produto: true } } },
  });
  if (!op) throw new NotFoundError('OP não encontrada');

  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, empresaId: params.empresaId },
  });
  if (!produto) throw new NotFoundError('Produto não encontrado');
  if (produto.familia !== 'MP') {
    throw new AppError('SOBRA_NAO_MP', 'Sobra/retalho só para MP consumida na OP', 400);
  }

  const consumido = op.movimentosEstoque.some(
    (m) =>
      m.produtoId === params.produtoId &&
      m.tipo === 'SAIDA' &&
      m.motivo === 'CONSUMO_OP',
  );
  if (!consumido) {
    throw new AppError(
      'MP_NAO_CONSUMIDA_OP',
      'MP informada não foi consumida nesta OP',
      400,
    );
  }

  const qtde = qty(new Decimal(params.quantidade));
  if (qtde.lte(0)) {
    throw new AppError('QTDE_INVALIDA', 'Quantidade deve ser > 0', 400);
  }

  const saldo = await prisma.saldoEstoque.findUnique({
    where: {
      empresaId_produtoId: { empresaId: params.empresaId, produtoId: params.produtoId },
    },
  });
  const custo = saldo ? new Decimal(saldo.custoMedio.toString()) : new Decimal(0);

  const mov = await prisma.$transaction(async (tx) =>
    aplicarMovimento(tx, {
      empresaId: params.empresaId,
      produtoId: params.produtoId,
      tipo: 'ENTRADA',
      motivo: 'SOBRA_RETALHO',
      quantidade: qtde,
      custoUnitario: custo,
      ordemProducaoId: op.id,
      motivoTexto: `Sobra/retalho OP ${op.codigo}`,
      criadoPorId: params.usuarioId,
    }),
  );

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'EST.MOV.SOBRA',
    entidade: 'MovimentoEstoque',
    entidadeId: mov.codigo,
    paraJson: {
      opCodigo: op.codigo,
      produtoCodigo: produto.codigo,
      quantidade: mov.quantidade.toString(),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeMov(mov);
}
