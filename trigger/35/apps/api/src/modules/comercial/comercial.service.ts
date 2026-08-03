import { createHash, randomBytes } from 'node:crypto';
import type { FamiliaProduto, Prisma, TipoItemComercial } from '@prisma/client';
import { Decimal, money } from '../shared/decimal/money.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../shared/errors/app-error.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { assertVendaPermitida } from '../plataforma/auth/auth.service.js';
import { nextCodigoDocumento } from '../cadastros/shared/codigo.service.js';

const includeOrc = {
  parceiro: true,
  itens: { orderBy: { sequencia: 'asc' as const } },
  cenarios: {
    orderBy: { sequencia: 'asc' as const },
    include: { itens: { orderBy: { sequencia: 'asc' as const } } },
  },
  pedido: true,
} as const;

type ItemInput = {
  produtoId?: string | null;
  descricao?: string;
  tipoItem?: TipoItemComercial;
  quantidade: string;
  unidadeCodigo?: string;
  precoUnitario?: string;
  descontoPct?: string;
  custoInternoUnitario?: string | null;
  specJson?: Prisma.InputJsonValue | null;
};

function familiaToTipo(familia: FamiliaProduto): TipoItemComercial {
  if (familia === 'SVC') return 'SERVICO';
  if (familia === 'REV') return 'REVENDA';
  return 'PRODUCAO'; // PA, MP, EMB usados em contexto de venda/produção
}

function calcItem(qtde: Decimal, preco: Decimal, descPct: Decimal) {
  const bruto = qtde.mul(preco);
  const liquido = bruto.mul(new Decimal(1).minus(descPct.div(100)));
  return money(liquido);
}

async function aliquotaImpostoEstimada(empresaId: bigint): Promise<Decimal> {
  const p = await prisma.parametroEmpresa.findUnique({
    where: { empresaId_chave: { empresaId, chave: 'imposto_estimado_pct' } },
  });
  return new Decimal(p?.valor ?? '6');
}

async function paramDecimal(empresaId: bigint, chave: string, fallback: string): Promise<Decimal> {
  const p = await prisma.parametroEmpresa.findUnique({
    where: { empresaId_chave: { empresaId, chave } },
  });
  return new Decimal(p?.valor ?? fallback);
}

async function alçadaDescontoMax(empresaId: bigint, perfis: string[]): Promise<Decimal> {
  if (perfis.includes('ADMIN') || perfis.includes('FINANCEIRO')) return new Decimal(100);
  return paramDecimal(empresaId, 'desconto_max_pct_comercial', '5');
}

async function alçadaGorduraMax(empresaId: bigint, perfis: string[]): Promise<Decimal> {
  if (perfis.includes('ADMIN') || perfis.includes('FINANCEIRO')) return new Decimal(100);
  return paramDecimal(empresaId, 'gordura_max_pct_comercial', '10');
}

function serializeOrcamento(
  o: Prisma.OrcamentoGetPayload<{ include: typeof includeOrc }>,
  opts?: { interno?: boolean },
) {
  const interno = opts?.interno ?? true;
  return {
    id: o.id.toString(),
    codigo: o.codigo,
    versao: o.versao,
    status: o.status,
    parceiro: {
      id: o.parceiro.id.toString(),
      codigo: o.parceiro.codigo,
      razaoSocial: o.parceiro.razaoSocial,
      ehProspect: o.parceiro.ehProspect,
      cadastroFiscalCompleto: o.parceiro.cadastroFiscalCompleto,
    },
    condicaoPagamento: o.condicaoPagamento,
    prazoDias: o.prazoDias,
    observacoesCliente: o.observacoesCliente,
    observacoesInternas: interno ? o.observacoesInternas : undefined,
    gorduraPct: o.gorduraPct.toString(),
    descontoPct: o.descontoPct.toString(),
    subtotal: o.subtotal.toString(),
    valorImpostoEstimado: o.valorImpostoEstimado.toString(),
    valorTotal: o.valorTotal.toString(),
    impostoEhEstimativa: true,
    enviadoEm: o.enviadoEm,
    aprovadoEm: o.aprovadoEm,
    pedidoId: o.pedido?.id.toString() ?? null,
    pedidoCodigo: o.pedido?.codigo ?? null,
    cenarios: o.cenarios?.map((c) => ({
      id: c.id.toString(),
      sequencia: c.sequencia,
      ativo: c.ativo,
      label: c.label,
      itens: c.itens.map((i) => ({
        sequencia: i.sequencia,
        produtoCodigo: i.produtoCodigo,
        descricao: i.descricao,
        tipoItem: i.tipoItem,
        quantidade: i.quantidade.toString(),
        precoUnitario: i.precoUnitario.toString(),
        valorTotal: i.valorTotal.toString(),
      })),
    })),
    itens: o.itens.map((i) => ({
      id: i.id.toString(),
      sequencia: i.sequencia,
      produtoId: i.produtoId?.toString() ?? null,
      produtoCodigo: i.produtoCodigo,
      descricao: i.descricao,
      tipoItem: i.tipoItem,
      quantidade: i.quantidade.toString(),
      unidadeCodigo: i.unidadeCodigo,
      precoUnitario: i.precoUnitario.toString(),
      descontoPct: i.descontoPct.toString(),
      valorTotal: i.valorTotal.toString(),
      custoInternoUnitario: interno ? (i.custoInternoUnitario?.toString() ?? null) : undefined,
      specJson: i.specJson,
    })),
  };
}

async function buildItensData(empresaId: bigint, itens: ItemInput[]) {
  if (!itens.length) throw new AppError('ORC_SEM_ITENS', 'Informe ao menos um item', 400);
  const rows: Prisma.OrcamentoItemCreateWithoutOrcamentoInput[] = [];
  let seq = 1;
  let subtotal = money(0);

  for (const raw of itens) {
    const qtde = new Decimal(raw.quantidade);
    if (!qtde.isPositive()) throw new AppError('QTD_INVALIDA', 'Quantidade deve ser > 0', 400);

    let produtoCodigo: string | null = null;
    let descricao = raw.descricao?.trim() || '';
    let tipoItem: TipoItemComercial = raw.tipoItem ?? 'PRODUCAO';
    let unidadeCodigo = raw.unidadeCodigo?.toUpperCase() || 'UN';
    let preco = raw.precoUnitario ? new Decimal(raw.precoUnitario) : null;
    let produtoId: bigint | null = null;

    if (raw.produtoId) {
      const prod = await prisma.produto.findFirst({
        where: { id: BigInt(raw.produtoId), empresaId, situacao: 'ATIVO' },
        include: { unidadeComercial: true },
      });
      if (!prod) throw new NotFoundError(`Produto ${raw.produtoId} não encontrado`);
      produtoId = prod.id;
      produtoCodigo = prod.codigo;
      descricao = descricao || prod.descricao;
      tipoItem = raw.tipoItem ?? familiaToTipo(prod.familia);
      unidadeCodigo = raw.unidadeCodigo?.toUpperCase() || prod.unidadeComercial.codigo;
      if (!preco) {
        if (!prod.precoTabela) {
          throw new AppError(
            'PRECO_OBRIGATORIO',
            `Informe preço unitário para ${prod.codigo} (sem preço de tabela)`,
            400,
          );
        }
        preco = new Decimal(prod.precoTabela.toString());
      }
    }

    if (!descricao) throw new AppError('DESC_OBRIGATORIA', 'Descrição do item obrigatória', 400);
    if (!preco || preco.isNegative()) {
      throw new AppError('PRECO_INVALIDO', 'Preço unitário inválido', 400);
    }

    const descPct = new Decimal(raw.descontoPct ?? '0');
    if (descPct.isNegative() || descPct.gt(100)) {
      throw new AppError('DESCONTO_INVALIDO', 'Desconto % inválido', 400);
    }
    const valorTotal = calcItem(qtde, preco, descPct);
    subtotal = money(subtotal.plus(valorTotal));

    rows.push({
      sequencia: seq++,
      produtoId,
      produtoCodigo,
      descricao,
      tipoItem,
      quantidade: qtde.toFixed(4),
      unidadeCodigo,
      precoUnitario: preco.toFixed(4),
      descontoPct: descPct.toFixed(4),
      valorTotal: valorTotal.toFixed(2),
      custoInternoUnitario: raw.custoInternoUnitario
        ? new Decimal(raw.custoInternoUnitario).toFixed(4)
        : null,
      specJson: raw.specJson ?? undefined,
    });
  }

  return { rows, subtotal };
}

type CenarioInput = {
  label: string;
  ativo?: boolean;
  itens: ItemInput[];
};

async function buildCenariosData(empresaId: bigint, cenarios: CenarioInput[]) {
  const out: Array<{
    sequencia: number;
    ativo: boolean;
    label: string;
    itens: Prisma.OrcamentoCenarioItemCreateWithoutCenarioInput[];
    subtotal: Decimal;
  }> = [];
  let seq = 1;
  let anyAtivo = false;
  for (const c of cenarios) {
    const { rows, subtotal } = await buildItensData(empresaId, c.itens);
    const ativo = c.ativo ?? false;
    if (ativo) anyAtivo = true;
    out.push({
      sequencia: seq++,
      ativo,
      label: c.label,
      itens: rows.map((r, idx) => ({
        sequencia: idx + 1,
        produtoId: r.produtoId ?? null,
        produtoCodigo: r.produtoCodigo,
        descricao: r.descricao,
        tipoItem: r.tipoItem,
        quantidade: r.quantidade,
        unidadeCodigo: r.unidadeCodigo,
        precoUnitario: r.precoUnitario,
        descontoPct: r.descontoPct,
        valorTotal: r.valorTotal,
      })),
      subtotal,
    });
  }
  if (out.length && !anyAtivo) out[0]!.ativo = true;
  return out;
}

function itensEfetivosOrcamento(
  orc: Prisma.OrcamentoGetPayload<{ include: typeof includeOrc }>,
) {
  const ativo = orc.cenarios.find((c) => c.ativo);
  if (ativo?.itens.length) {
    return ativo.itens.map((i) => ({
      sequencia: i.sequencia,
      produtoId: i.produtoId,
      produtoCodigo: i.produtoCodigo,
      descricao: i.descricao,
      tipoItem: i.tipoItem,
      quantidade: i.quantidade,
      unidadeCodigo: i.unidadeCodigo,
      precoUnitario: i.precoUnitario,
      descontoPct: i.descontoPct,
      valorTotal: i.valorTotal,
      specJson: null as Prisma.JsonValue | null,
    }));
  }
  return orc.itens;
}

export async function listarOrcamentos(params: {
  empresaId: bigint;
  status?: string;
  q?: string;
  limit?: number;
}) {
  const where: Prisma.OrcamentoWhereInput = { empresaId: params.empresaId };
  if (params.status) where.status = params.status as never;
  if (params.q) {
    where.OR = [
      { codigo: { contains: params.q, mode: 'insensitive' } },
      { parceiro: { razaoSocial: { contains: params.q, mode: 'insensitive' } } },
    ];
  }
  const rows = await prisma.orcamento.findMany({
    where,
    include: includeOrc,
    orderBy: [{ criadoEm: 'desc' }],
    take: params.limit ?? 50,
  });
  return rows.map((o) => serializeOrcamento(o));
}

export async function obterOrcamento(empresaId: bigint, id: bigint, interno = true) {
  const o = await prisma.orcamento.findFirst({
    where: { id, empresaId },
    include: includeOrc,
  });
  if (!o) throw new NotFoundError('Orçamento não encontrado');
  return serializeOrcamento(o, { interno });
}

export async function criarOrcamento(params: {
  empresaId: bigint;
  usuarioId: bigint;
  perfis: string[];
  input: {
    parceiroId: string;
    condicaoPagamento?: string | null;
    prazoDias?: number;
    observacoesCliente?: string | null;
    observacoesInternas?: string | null;
    gorduraPct?: string;
    descontoPct?: string;
    facaId?: string | null;
    itens: ItemInput[];
    cenarios?: CenarioInput[];
  };
  ip?: string;
  correlationId?: string;
}) {
  await assertVendaPermitida(params.empresaId);

  const parceiro = await prisma.parceiro.findFirst({
    where: {
      id: BigInt(params.input.parceiroId),
      empresaId: params.empresaId,
      situacao: 'ATIVO',
      papelCliente: true,
    },
  });
  if (!parceiro) throw new NotFoundError('Cliente/prospect não encontrado');

  const descontoPct = new Decimal(params.input.descontoPct ?? '0');
  const maxDesc = await alçadaDescontoMax(params.empresaId, params.perfis);
  if (descontoPct.gt(maxDesc)) {
    throw new ForbiddenError(
      `Desconto ${descontoPct}% acima da alçada (${maxDesc}%)`,
      'ALCADA_DESCONTO',
    );
  }

  const gorduraPct = new Decimal(params.input.gorduraPct ?? '0');
  const maxGord = await alçadaGorduraMax(params.empresaId, params.perfis);
  if (gorduraPct.gt(maxGord)) {
    throw new ForbiddenError(
      `Gordura ${gorduraPct}% acima da alçada (${maxGord}%)`,
      'ALCADA_GORDURA',
    );
  }

  if (params.input.facaId) {
    const faca = await prisma.faca.findFirst({
      where: { id: BigInt(params.input.facaId), empresaId: params.empresaId },
    });
    if (!faca) throw new NotFoundError('Faca não encontrada');
    if (faca.jaCobrado) {
      throw new AppError('FACA_JA_COBRADA', `Faca ${faca.codigo} já foi cobrada (1x)`, 409);
    }
  }

  const useCenarios = params.input.cenarios?.length ? params.input.cenarios : null;
  const { rows, subtotal: subItens } = useCenarios
    ? { rows: [] as Prisma.OrcamentoItemCreateWithoutOrcamentoInput[], subtotal: money(0) }
    : await buildItensData(params.empresaId, params.input.itens);

  let subtotalBase = subItens;
  let cenariosCreate: Prisma.OrcamentoCenarioCreateWithoutOrcamentoInput[] | undefined;
  if (useCenarios) {
    const built = await buildCenariosData(params.empresaId, useCenarios);
    const ativo = built.find((c) => c.ativo) ?? built[0]!;
    subtotalBase = ativo.subtotal;
    cenariosCreate = built.map((c) => ({
      sequencia: c.sequencia,
      ativo: c.ativo,
      label: c.label,
      itens: { create: c.itens },
    }));
  }

  const { rows: _rowsIgnored, subtotal: _subIgnored } = { rows, subtotal: subtotalBase };
  void _rowsIgnored;
  void _subIgnored;
  const subtotal = subtotalBase;
  const subtotalComGordura = money(subtotal.mul(new Decimal(1).plus(gorduraPct.div(100))));
  const subtotalComDesc = money(
    subtotalComGordura.mul(new Decimal(1).minus(descontoPct.div(100))),
  );
  const aliq = await aliquotaImpostoEstimada(params.empresaId);
  const imposto = money(subtotalComDesc.mul(aliq.div(100)));
  const total = money(subtotalComDesc.plus(imposto));

  const codigo = await nextCodigoDocumento(params.empresaId, 'ORC');
  const created = await prisma.orcamento.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      versao: 1,
      parceiroId: parceiro.id,
      condicaoPagamento: params.input.condicaoPagamento ?? '28 DDL',
      prazoDias: params.input.prazoDias ?? 7,
      observacoesCliente: params.input.observacoesCliente ?? null,
      observacoesInternas: params.input.observacoesInternas ?? null,
      gorduraPct: gorduraPct.toFixed(4),
      descontoPct: descontoPct.toFixed(4),
      subtotal: subtotalComDesc.toFixed(2),
      valorImpostoEstimado: imposto.toFixed(2),
      valorTotal: total.toFixed(2),
      snapshotParametros: {
        impostoEstimadoPct: aliq.toString(),
        statusRatificacao: 'PENDENTE_RATIFICACAO',
        arredondamento: 'HALF_UP_DINHEIRO',
      },
      criadoPorId: params.usuarioId,
      facaId: params.input.facaId ? BigInt(params.input.facaId) : null,
      itens: useCenarios ? undefined : { create: rows },
      cenarios: cenariosCreate ? { create: cenariosCreate } : undefined,
    },
    include: includeOrc,
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'ORC_CRIAR',
    entidade: 'orcamento',
    entidadeId: created.id.toString(),
    paraJson: { codigo: created.codigo, total: created.valorTotal.toString() },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOrcamento(created);
}

export async function enviarOrcamentoAceite(params: {
  empresaId: bigint;
  usuarioId: bigint;
  orcamentoId: bigint;
  validadeHoras?: number;
  publicBaseUrl: string;
  ip?: string;
  correlationId?: string;
}) {
  const orc = await prisma.orcamento.findFirst({
    where: { id: params.orcamentoId, empresaId: params.empresaId },
    include: includeOrc,
  });
  if (!orc) throw new NotFoundError('Orçamento não encontrado');
  if (!['RASCUNHO', 'EXPIRADO', 'RECUSADO'].includes(orc.status)) {
    throw new AppError('ORC_STATUS', `Não é possível enviar ORC em status ${orc.status}`, 400);
  }
  if (!orc.itens.length && !orc.cenarios.some((c) => c.itens.length)) {
    throw new AppError('ORC_SEM_ITENS', 'ORC sem itens', 400);
  }

  // invalida tokens anteriores
  await prisma.aceiteOrcamento.updateMany({
    where: { orcamentoId: orc.id, usadoEm: null },
    data: { usadoEm: new Date(), acao: null },
  });

  const token = randomBytes(24).toString('hex');
  const horas = params.validadeHoras ?? 72;
  const expiraEm = new Date(Date.now() + horas * 3600_000);

  await prisma.aceiteOrcamento.create({
    data: { orcamentoId: orc.id, token, expiraEm },
  });

  const updated = await prisma.orcamento.update({
    where: { id: orc.id },
    data: { status: 'ENVIADO', enviadoEm: new Date() },
    include: includeOrc,
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'OrcamentoEnviadoAceite',
      agregadoTipo: 'orcamento',
      agregadoId: orc.id.toString(),
      payload: { codigo: orc.codigo, tokenHash: createHash('sha256').update(token).digest('hex') },
      idempotencyKey: `orc-env-${orc.id}-${Date.now()}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'ORC_ENVIAR_ACEITE',
    entidade: 'orcamento',
    entidadeId: orc.id.toString(),
    paraJson: { status: 'ENVIADO', expiraEm },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  const link = `${params.publicBaseUrl.replace(/\/$/, '')}/aceite/${token}`;
  return {
    orcamento: serializeOrcamento(updated),
    linkAceite: link,
    expiraEm,
    // token só na resposta do comercial (DEV/homolog) — não logar
    tokenDev: token,
  };
}

export async function obterPropostaPublica(token: string) {
  const aceite = await prisma.aceiteOrcamento.findUnique({
    where: { token },
    include: { orcamento: { include: includeOrc } },
  });
  if (!aceite) throw new NotFoundError('Link inválido');
  if (aceite.usadoEm) {
    throw new AppError('LINK_USADO', 'Este link já foi utilizado', 410);
  }
  if (aceite.expiraEm < new Date()) {
    if (aceite.orcamento.status === 'ENVIADO') {
      await prisma.orcamento.update({
        where: { id: aceite.orcamentoId },
        data: { status: 'EXPIRADO' },
      });
    }
    throw new AppError('LINK_EXPIRADO', 'Link expirado', 410);
  }
  if (aceite.orcamento.status !== 'ENVIADO') {
    throw new AppError('ORC_STATUS', 'Proposta não está aguardando aceite', 400);
  }

  // visão cliente: sem custo interno
  return {
    expiraEm: aceite.expiraEm,
    proposta: serializeOrcamento(aceite.orcamento, { interno: false }),
  };
}

export async function processarAceitePublico(params: {
  token: string;
  acao: 'APROVAR' | 'RECUSAR';
  motivoRecusa?: string | null;
  ip?: string;
  userAgent?: string;
}) {
  const aceite = await prisma.aceiteOrcamento.findUnique({
    where: { token: params.token },
    include: { orcamento: { include: includeOrc } },
  });
  if (!aceite) throw new NotFoundError('Link inválido');
  if (aceite.usadoEm) throw new AppError('LINK_USADO', 'Link já utilizado', 410);
  if (aceite.expiraEm < new Date()) {
    await prisma.orcamento.update({
      where: { id: aceite.orcamentoId },
      data: { status: 'EXPIRADO' },
    });
    throw new AppError('LINK_EXPIRADO', 'Link expirado', 410);
  }
  if (aceite.orcamento.status !== 'ENVIADO') {
    throw new AppError('ORC_STATUS', 'Proposta não aguarda aceite', 400);
  }

  if (params.acao === 'RECUSAR') {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.aceiteOrcamento.update({
        where: { id: aceite.id },
        data: {
          usadoEm: new Date(),
          acao: 'RECUSAR',
          ip: params.ip,
          userAgent: params.userAgent,
          motivoRecusa: params.motivoRecusa ?? null,
        },
      });
      return tx.orcamento.update({
        where: { id: aceite.orcamentoId },
        data: { status: 'RECUSADO', recusadoEm: new Date() },
        include: includeOrc,
      });
    });
    await registrarAuditoria({
      empresaId: updated.empresaId,
      acao: 'ORC_RECUSADO_CLIENTE',
      entidade: 'orcamento',
      entidadeId: updated.id.toString(),
      paraJson: { motivo: params.motivoRecusa ?? null },
      ip: params.ip,
    });
    return { status: 'RECUSADO' as const, orcamento: serializeOrcamento(updated, { interno: false }) };
  }

  // APROVAR
  const updated = await prisma.$transaction(async (tx) => {
    await tx.aceiteOrcamento.update({
      where: { id: aceite.id },
      data: {
        usadoEm: new Date(),
        acao: 'APROVAR',
        ip: params.ip,
        userAgent: params.userAgent,
      },
    });
    return tx.orcamento.update({
      where: { id: aceite.orcamentoId },
      data: { status: 'APROVADO', aprovadoEm: new Date() },
      include: includeOrc,
    });
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: updated.empresaId,
      tipo: 'OrcamentoAprovadoCliente',
      agregadoTipo: 'orcamento',
      agregadoId: updated.id.toString(),
      payload: { codigo: updated.codigo, versao: updated.versao },
      idempotencyKey: `orc-apr-${updated.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: updated.empresaId,
    acao: 'ORC_APROVADO_CLIENTE',
    entidade: 'orcamento',
    entidadeId: updated.id.toString(),
    ip: params.ip,
  });

  let pedido = null as ReturnType<typeof serializePedido> | null;
  let bloqueioConversao: string | null = null;

  if (!updated.parceiro.cadastroFiscalCompleto || updated.parceiro.ehProspect) {
    bloqueioConversao =
      'Cadastro fiscal incompleto — complete o PAR antes de gerar PED (UC-CAD-002)';
  } else {
    pedido = await converterOrcamentoEmPedido({
      empresaId: updated.empresaId,
      orcamentoId: updated.id,
      usuarioId: null,
      ip: params.ip,
      correlationId: undefined,
      automatico: true,
    });
  }

  return {
    status: 'APROVADO' as const,
    orcamento: serializeOrcamento(
      await prisma.orcamento.findFirstOrThrow({
        where: { id: updated.id },
        include: includeOrc,
      }),
      { interno: false },
    ),
    pedido,
    bloqueioConversao,
  };
}

function serializePedido(
  p: Prisma.PedidoGetPayload<{
    include: { parceiro: true; itens: true; orcamento: true };
  }>,
) {
  return {
    id: p.id.toString(),
    codigo: p.codigo,
    status: p.status,
    orcamentoCodigo: p.orcamentoCodigo,
    orcamentoVersao: p.orcamentoVersao,
    parceiro: {
      id: p.parceiro.id.toString(),
      codigo: p.parceiro.codigo,
      razaoSocial: p.parceiro.razaoSocial,
    },
    condicaoPagamento: p.condicaoPagamento,
    prazoDias: p.prazoDias,
    subtotal: p.subtotal.toString(),
    valorImpostoEstimado: p.valorImpostoEstimado.toString(),
    valorTotal: p.valorTotal.toString(),
    creditoLiberadoEm: p.creditoLiberadoEm,
    itens: p.itens.map((i) => ({
      id: i.id.toString(),
      sequencia: i.sequencia,
      produtoId: i.produtoId?.toString() ?? null,
      produtoCodigo: i.produtoCodigo,
      descricao: i.descricao,
      tipoItem: i.tipoItem,
      quantidade: i.quantidade.toString(),
      unidadeCodigo: i.unidadeCodigo,
      precoUnitario: i.precoUnitario.toString(),
      descontoPct: i.descontoPct.toString(),
      valorTotal: i.valorTotal.toString(),
    })),
  };
}

export async function converterOrcamentoEmPedido(params: {
  empresaId: bigint;
  orcamentoId: bigint;
  usuarioId: bigint | null;
  ip?: string;
  correlationId?: string;
  automatico?: boolean;
}) {
  const orc = await prisma.orcamento.findFirst({
    where: { id: params.orcamentoId, empresaId: params.empresaId },
    include: includeOrc,
  });
  if (!orc) throw new NotFoundError('Orçamento não encontrado');
  if (orc.status !== 'APROVADO') {
    throw new AppError('ORC_NAO_APROVADO', 'Só ORC APROVADO vira PED', 400);
  }
  if (orc.pedido) {
    throw new ConflictError(`Já existe ${orc.pedido.codigo} para este ORC`, 'PED_JA_EXISTE');
  }
  if (!orc.parceiro.cadastroFiscalCompleto || orc.parceiro.ehProspect) {
    throw new AppError(
      'CADASTRO_FISCAL_INCOMPLETO',
      'Complete cadastro fiscal do parceiro antes do PED',
      400,
    );
  }

  const codigo = await nextCodigoDocumento(params.empresaId, 'PED');
  const snapshot = serializeOrcamento(orc, { interno: true });
  const itensPed = itensEfetivosOrcamento(orc);

  const created = await prisma.pedido.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      parceiroId: orc.parceiroId,
      orcamentoId: orc.id,
      orcamentoCodigo: orc.codigo,
      orcamentoVersao: orc.versao,
      status: 'AGUARDA_CREDITO',
      condicaoPagamento: orc.condicaoPagamento,
      prazoDias: orc.prazoDias,
      subtotal: orc.subtotal,
      valorImpostoEstimado: orc.valorImpostoEstimado,
      valorTotal: orc.valorTotal,
      snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
      itens: {
        create: itensPed.map((i) => ({
          sequencia: i.sequencia,
          produtoId: i.produtoId,
          produtoCodigo: i.produtoCodigo,
          descricao: i.descricao,
          tipoItem: i.tipoItem,
          quantidade: i.quantidade,
          unidadeCodigo: i.unidadeCodigo,
          precoUnitario: i.precoUnitario,
          descontoPct: i.descontoPct,
          valorTotal: i.valorTotal,
          specJson: i.specJson ?? undefined,
        })),
      },
    },
    include: { parceiro: true, itens: true, orcamento: true },
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'PedidoGerado',
      agregadoTipo: 'pedido',
      agregadoId: created.id.toString(),
      payload: { codigo: created.codigo, orc: orc.codigo, automatico: !!params.automatico },
      idempotencyKey: `ped-gen-${orc.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PED_CRIAR_SNAPSHOT',
    entidade: 'pedido',
    entidadeId: created.id.toString(),
    paraJson: {
      codigo: created.codigo,
      orc: orc.codigo,
      valorTotal: created.valorTotal.toString(),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializePedido(created);
}

export async function listarPedidos(params: {
  empresaId: bigint;
  status?: string;
  limit?: number;
}) {
  const rows = await prisma.pedido.findMany({
    where: {
      empresaId: params.empresaId,
      ...(params.status ? { status: params.status as never } : {}),
    },
    include: { parceiro: true, itens: true, orcamento: true },
    orderBy: { criadoEm: 'desc' },
    take: params.limit ?? 50,
  });
  return rows.map(serializePedido);
}

export async function liberarCreditoPedido(params: {
  empresaId: bigint;
  usuarioId: bigint;
  pedidoId: bigint;
  motivo?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const ped = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: { parceiro: true, itens: true, orcamento: true },
  });
  if (!ped) throw new NotFoundError('Pedido não encontrado');
  if (ped.status !== 'AGUARDA_CREDITO' && ped.status !== 'NOVO') {
    throw new AppError('PED_STATUS', `Pedido em ${ped.status} não aguarda crédito`, 400);
  }

  const updated = await prisma.pedido.update({
    where: { id: ped.id },
    data: {
      status: 'LIBERADO',
      creditoLiberadoEm: new Date(),
      creditoLiberadoPorId: params.usuarioId,
      creditoMotivo: params.motivo ?? 'Liberação financeira',
    },
    include: { parceiro: true, itens: true, orcamento: true },
  });

  await prisma.outboxEvent.create({
    data: {
      empresaId: params.empresaId,
      tipo: 'CreditoLiberado',
      agregadoTipo: 'pedido',
      agregadoId: ped.id.toString(),
      payload: { codigo: ped.codigo },
      idempotencyKey: `crt-${ped.id}`,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PED_LIBERAR_CREDITO',
    entidade: 'pedido',
    entidadeId: ped.id.toString(),
    deJson: { status: ped.status },
    paraJson: { status: 'LIBERADO', motivo: params.motivo ?? null },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializePedido(updated);
}

export async function solicitarAdiantamentoPedido(params: {
  empresaId: bigint;
  usuarioId: bigint;
  pedidoId: bigint;
  valorPct?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const ped = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: { parceiro: true, itens: true, orcamento: true },
  });
  if (!ped) throw new NotFoundError('Pedido não encontrado');
  if (!['NOVO', 'AGUARDA_CREDITO', 'LIBERADO'].includes(ped.status)) {
    throw new AppError('PED_STATUS', `PED em ${ped.status} não aceita adiantamento`, 400);
  }

  const pct = new Decimal(params.valorPct ?? '30');
  const valorSinal = money(
    new Decimal(ped.valorTotal.toString()).mul(pct.div(100)),
  );

  const updated = await prisma.pedido.update({
    where: { id: ped.id },
    data: { status: 'AGUARDA_ADIANTAMENTO' },
    include: { parceiro: true, itens: true, orcamento: true },
  });

  const { gerarTituloSinal } = await import('../financeiro/financeiro.service.js');
  const tit = await gerarTituloSinal({
    empresaId: params.empresaId,
    pedidoId: ped.id,
    valor: valorSinal.toFixed(2),
    usuarioId: params.usuarioId,
    ip: params.ip,
    correlationId: params.correlationId,
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PED_SOLICITAR_ADIANTAMENTO',
    entidade: 'pedido',
    entidadeId: ped.id.toString(),
    paraJson: {
      codigo: ped.codigo,
      tituloCodigo: tit.titulo.codigo,
      valorSinal: valorSinal.toFixed(2),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return { pedido: serializePedido(updated), titulo: tit.titulo };
}

export async function consultarCredito(empresaId: bigint, parceiroId: bigint) {
  const lim = await prisma.limiteCreditoParceiro.findFirst({
    where: { empresaId, parceiroId },
  });
  const limite = new Decimal(lim?.limite?.toString() ?? '0');
  const abertos = await prisma.pedido.aggregate({
    where: {
      empresaId,
      parceiroId,
      status: { in: ['AGUARDA_CREDITO', 'LIBERADO', 'EM_PRODUCAO', 'EM_SEPARACAO', 'FATURADO_PARCIAL'] },
    },
    _sum: { valorTotal: true },
  });
  const exposicao = new Decimal(abertos._sum.valorTotal?.toString() ?? '0');
  const saldo = money(limite.minus(exposicao));
  let situacao: 'OK' | 'ESTOURADO' | 'SEM_LIMITE' = 'OK';
  if (limite.lte(0)) situacao = 'SEM_LIMITE';
  else if (saldo.isNegative()) situacao = 'ESTOURADO';
  return {
    limite: limite.toFixed(2),
    exposicao: money(exposicao).toFixed(2),
    saldo: saldo.toFixed(2),
    situacao,
    bloqueado: lim?.bloqueado ?? false,
  };
}
