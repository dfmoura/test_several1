import { prisma } from '../../infrastructure/prisma/client.js';
import { nextCodigoDocumento } from '../cadastros/shared/codigo.service.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { AppError, ForbiddenError, NotFoundError } from '../shared/errors/app-error.js';
import { Decimal, money, qty, qtyToString } from '../shared/decimal/money.js';
import { aplicarMovimento } from '../estoque/estoque.service.js';
import { parseNfeCompraXml } from './nfe-xml.parser.js';

function serializeCotacao(
  c: Awaited<ReturnType<typeof loadCotacao>>,
) {
  if (!c) return null;
  return {
    id: c.id.toString(),
    codigo: c.codigo,
    status: c.status,
    urgente: c.urgente,
    observacoes: c.observacoes,
    ordemProducaoId: c.ordemProducaoId?.toString() ?? null,
    ordemProducao: c.ordemProducao
      ? { id: c.ordemProducao.id.toString(), codigo: c.ordemProducao.codigo, status: c.ordemProducao.status }
      : null,
    itens: c.itens.map((i) => ({
      id: i.id.toString(),
      produtoId: i.produtoId.toString(),
      quantidade: qtyToString(new Decimal(i.quantidade.toString())),
      produto: { id: i.produto.id.toString(), codigo: i.produto.codigo, descricao: i.produto.descricao },
    })),
    propostas: c.propostas.map((p) => ({
      id: p.id.toString(),
      fornecedorId: p.fornecedorId.toString(),
      precoUnitario: new Decimal(p.precoUnitario.toString()).toFixed(4),
      prazoDias: p.prazoDias,
      frete: money(p.frete.toString()).toFixed(2),
      vencedora: p.vencedora,
      fornecedor: {
        id: p.fornecedor.id.toString(),
        codigo: p.fornecedor.codigo,
        razaoSocial: p.fornecedor.razaoSocial,
      },
    })),
    criadoEm: c.criadoEm,
  };
}

async function loadCotacao(empresaId: bigint, id: bigint) {
  return prisma.cotacaoCompra.findFirst({
    where: { id, empresaId },
    include: {
      itens: { include: { produto: true } },
      propostas: { include: { fornecedor: true } },
      ordemProducao: true,
    },
  });
}

function serializeOc(
  o: NonNullable<Awaited<ReturnType<typeof loadOc>>>,
) {
  return {
    id: o.id.toString(),
    codigo: o.codigo,
    status: o.status,
    urgente: o.urgente,
    valorTotal: money(o.valorTotal.toString()).toFixed(2),
    fornecedor: {
      id: o.fornecedor.id.toString(),
      codigo: o.fornecedor.codigo,
      razaoSocial: o.fornecedor.razaoSocial,
    },
    ordemProducaoId: o.ordemProducaoId?.toString() ?? null,
    cotacaoId: o.cotacaoId?.toString() ?? null,
    itens: o.itens.map((i) => ({
      id: i.id.toString(),
      produtoId: i.produtoId.toString(),
      quantidade: qtyToString(new Decimal(i.quantidade.toString())),
      precoUnitario: new Decimal(i.precoUnitario.toString()).toFixed(4),
      valorTotal: money(i.valorTotal.toString()).toFixed(2),
      qtdeRecebida: qtyToString(new Decimal(i.qtdeRecebida.toString())),
      produto: { id: i.produto.id.toString(), codigo: i.produto.codigo, descricao: i.produto.descricao },
    })),
    criadoEm: o.criadoEm,
  };
}

async function loadOc(empresaId: bigint, id: bigint) {
  return prisma.ordemCompra.findFirst({
    where: { id, empresaId },
    include: { fornecedor: true, itens: { include: { produto: true } } },
  });
}

async function paramAlcada(empresaId: bigint): Promise<Decimal> {
  const p = await prisma.parametroEmpresa.findFirst({
    where: { empresaId, chave: 'compras_alcada_valor_max' },
  });
  return money(p?.valor ?? '5000');
}

function temAlcadaAprovacao(perfis: string[], permissoes: string[]) {
  return (
    perfis.includes('ADMIN') ||
    perfis.includes('FINANCEIRO') ||
    permissoes.includes('fin.credito.alterar') ||
    permissoes.includes('cpr.alcada.aprovar')
  );
}

export async function listarCotacoes(empresaId: bigint, limit = 50) {
  const rows = await prisma.cotacaoCompra.findMany({
    where: { empresaId },
    include: {
      itens: { include: { produto: true } },
      propostas: { include: { fornecedor: true } },
      ordemProducao: true,
    },
    orderBy: { id: 'desc' },
    take: Math.min(limit, 100),
  });
  return rows.map((c) => serializeCotacao(c)!);
}

export async function criarCotacao(params: {
  empresaId: bigint;
  usuarioId: bigint;
  urgente?: boolean;
  ordemProducaoId?: string | null;
  observacoes?: string | null;
  itens: Array<{ produtoId: string; quantidade: string }>;
  ip?: string;
  correlationId?: string;
}) {
  if (!params.itens.length) {
    throw new AppError('COT_SEM_ITENS', 'Informe ao menos um item', 400);
  }

  let opId: bigint | null = null;
  if (params.ordemProducaoId) {
    const op = await prisma.ordemProducao.findFirst({
      where: { id: BigInt(params.ordemProducaoId), empresaId: params.empresaId },
    });
    if (!op) throw new NotFoundError('OP não encontrada');
    opId = op.id;
  }

  const cot = await prisma.$transaction(async (tx) => {
    const codigo = await nextCodigoDocumento(params.empresaId, 'COT', tx);
    const created = await tx.cotacaoCompra.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        urgente: params.urgente ?? false,
        ordemProducaoId: opId,
        observacoes: params.observacoes ?? null,
        criadoPorId: params.usuarioId,
        itens: {
          create: await Promise.all(
            params.itens.map(async (i) => {
              const prod = await tx.produto.findFirst({
                where: { id: BigInt(i.produtoId), empresaId: params.empresaId },
              });
              if (!prod) throw new NotFoundError(`Produto ${i.produtoId} não encontrado`);
              return {
                produtoId: prod.id,
                quantidade: qty(i.quantidade).toFixed(4),
              };
            }),
          ),
        },
      },
    });
    return created;
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'CPR.COT.CRIAR',
    entidade: 'CotacaoCompra',
    entidadeId: cot.codigo,
    paraJson: { urgente: cot.urgente, opId: opId?.toString() ?? null },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeCotacao(await loadCotacao(params.empresaId, cot.id));
}

export async function registrarProposta(params: {
  empresaId: bigint;
  usuarioId: bigint;
  cotacaoId: bigint;
  fornecedorId: string;
  precoUnitario: string;
  prazoDias?: number;
  frete?: string;
  observacoes?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const cot = await prisma.cotacaoCompra.findFirst({
    where: { id: params.cotacaoId, empresaId: params.empresaId },
  });
  if (!cot) throw new NotFoundError('Cotação não encontrada');
  if (cot.status !== 'ABERTA') {
    throw new AppError('COT_FECHADA', 'Cotação não está aberta', 409);
  }

  const forn = await prisma.parceiro.findFirst({
    where: {
      id: BigInt(params.fornecedorId),
      empresaId: params.empresaId,
      papelFornecedor: true,
    },
  });
  if (!forn) throw new NotFoundError('Fornecedor não encontrado');

  const prop = await prisma.cotacaoProposta.create({
    data: {
      cotacaoId: cot.id,
      fornecedorId: forn.id,
      precoUnitario: qty(params.precoUnitario, 4).toFixed(4),
      prazoDias: params.prazoDias ?? 7,
      frete: money(params.frete ?? '0').toFixed(2),
      observacoes: params.observacoes ?? null,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'CPR.COT.PROPOSTA',
    entidade: 'CotacaoProposta',
    entidadeId: prop.id.toString(),
    paraJson: { cotacao: cot.codigo, fornecedor: forn.codigo },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeCotacao(await loadCotacao(params.empresaId, cot.id));
}

export async function gerarOcDaCotacao(params: {
  empresaId: bigint;
  usuarioId: bigint;
  cotacaoId: bigint;
  propostaId: string;
  perfis: string[];
  permissoes: string[];
  ip?: string;
  correlationId?: string;
}) {
  const cot = await loadCotacao(params.empresaId, params.cotacaoId);
  if (!cot) throw new NotFoundError('Cotação não encontrada');
  if (cot.status !== 'ABERTA') {
    throw new AppError('COT_FECHADA', 'Cotação não está aberta', 409);
  }
  const prop = cot.propostas.find((p) => p.id.toString() === params.propostaId);
  if (!prop) throw new NotFoundError('Proposta não encontrada');
  if (!cot.itens.length) throw new AppError('COT_SEM_ITENS', 'Cotação sem itens', 400);

  const item0 = cot.itens[0]!;
  const qtde = qty(item0.quantidade);
  const preco = qty(prop.precoUnitario, 4);
  const frete = money(prop.frete.toString());
  let valorTotal = money(qtde.mul(preco).plus(frete).toFixed(2));
  // soma todos itens com mesmo preço unitário da proposta (simplificação dia-2: 1 preço por proposta)
  if (cot.itens.length > 1) {
    valorTotal = money(
      cot.itens
        .reduce((acc, i) => acc.plus(qty(i.quantidade).mul(preco)), new Decimal(0))
        .plus(frete)
        .toFixed(2),
    );
  }

  const alcada = await paramAlcada(params.empresaId);
  const precisaAlcada =
    valorTotal.gt(alcada) || (cot.urgente && !temAlcadaAprovacao(params.perfis, params.permissoes));

  if (precisaAlcada && !temAlcadaAprovacao(params.perfis, params.permissoes)) {
    // cria OC em AGUARDA_ALCADA
  }

  const oc = await prisma.$transaction(async (tx) => {
    await tx.cotacaoProposta.updateMany({
      where: { cotacaoId: cot.id },
      data: { vencedora: false },
    });
    await tx.cotacaoProposta.update({
      where: { id: prop.id },
      data: { vencedora: true },
    });
    await tx.cotacaoCompra.update({
      where: { id: cot.id },
      data: { status: 'DECIDIDA', decididoEm: new Date() },
    });

    const codigo = await nextCodigoDocumento(params.empresaId, 'OC', tx);
    const status =
      precisaAlcada && !temAlcadaAprovacao(params.perfis, params.permissoes)
        ? 'AGUARDA_ALCADA'
        : 'ABERTA';

    return tx.ordemCompra.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        status,
        fornecedorId: prop.fornecedorId,
        cotacaoId: cot.id,
        ordemProducaoId: cot.ordemProducaoId,
        urgente: cot.urgente,
        valorTotal: valorTotal.toFixed(2),
        criadoPorId: params.usuarioId,
        aprovadoPorId: status === 'ABERTA' ? params.usuarioId : null,
        aprovadoEm: status === 'ABERTA' ? new Date() : null,
        itens: {
          create: cot.itens.map((i) => {
            const q = qty(i.quantidade);
            const vt = money(q.mul(preco).toFixed(2));
            return {
              produtoId: i.produtoId,
              quantidade: q.toFixed(4),
              precoUnitario: preco.toFixed(4),
              valorTotal: vt.toFixed(2),
            };
          }),
        },
      },
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'CPR.OC.GERAR',
    entidade: 'OrdemCompra',
    entidadeId: oc.codigo,
    paraJson: { status: oc.status, valorTotal: oc.valorTotal.toString(), cotacao: cot.codigo },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOc((await loadOc(params.empresaId, oc.id))!);
}

export async function aprovarOrdemCompra(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemCompraId: bigint;
  perfis: string[];
  permissoes: string[];
  ip?: string;
  correlationId?: string;
}) {
  if (!temAlcadaAprovacao(params.perfis, params.permissoes)) {
    throw new ForbiddenError('Sem alçada para aprovar OC', 'SEM_ALCADA_OC');
  }
  const oc = await prisma.ordemCompra.findFirst({
    where: { id: params.ordemCompraId, empresaId: params.empresaId },
  });
  if (!oc) throw new NotFoundError('OC não encontrada');
  if (oc.status !== 'AGUARDA_ALCADA') {
    throw new AppError('OC_STATUS', 'OC não aguarda alçada', 409);
  }

  const updated = await prisma.ordemCompra.update({
    where: { id: oc.id },
    data: {
      status: 'ABERTA',
      aprovadoPorId: params.usuarioId,
      aprovadoEm: new Date(),
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'CPR.OC.APROVAR',
    entidade: 'OrdemCompra',
    entidadeId: updated.codigo,
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOc((await loadOc(params.empresaId, updated.id))!);
}

export async function listarOrdensCompra(empresaId: bigint, limit = 50) {
  const rows = await prisma.ordemCompra.findMany({
    where: { empresaId },
    include: { fornecedor: true, itens: { include: { produto: true } } },
    orderBy: { id: 'desc' },
    take: Math.min(limit, 100),
  });
  return rows.map(serializeOc);
}

export async function criarOcDireta(params: {
  empresaId: bigint;
  usuarioId: bigint;
  fornecedorId: string;
  urgente?: boolean;
  ordemProducaoId?: string | null;
  itens: Array<{ produtoId: string; quantidade: string; precoUnitario: string }>;
  perfis: string[];
  permissoes: string[];
  observacoes?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  if (!params.itens.length) throw new AppError('OC_SEM_ITENS', 'Informe itens', 400);

  const forn = await prisma.parceiro.findFirst({
    where: {
      id: BigInt(params.fornecedorId),
      empresaId: params.empresaId,
      papelFornecedor: true,
    },
  });
  if (!forn) throw new NotFoundError('Fornecedor não encontrado');

  let valorTotal = new Decimal(0);
  const itensData: Array<{
    produtoId: bigint;
    quantidade: string;
    precoUnitario: string;
    valorTotal: string;
  }> = [];

  for (const i of params.itens) {
    const prod = await prisma.produto.findFirst({
      where: { id: BigInt(i.produtoId), empresaId: params.empresaId },
    });
    if (!prod) throw new NotFoundError(`Produto ${i.produtoId}`);
    const q = qty(i.quantidade);
    const p = qty(i.precoUnitario, 4);
    const vt = money(q.mul(p).toFixed(2));
    valorTotal = valorTotal.plus(vt);
    itensData.push({
      produtoId: prod.id,
      quantidade: q.toFixed(4),
      precoUnitario: p.toFixed(4),
      valorTotal: vt.toFixed(2),
    });
  }

  const valor = money(valorTotal.toFixed(2));
  const alcada = await paramAlcada(params.empresaId);
  const precisa =
    valor.gt(alcada) ||
    ((params.urgente ?? false) && !temAlcadaAprovacao(params.perfis, params.permissoes));
  const status =
    precisa && !temAlcadaAprovacao(params.perfis, params.permissoes)
      ? 'AGUARDA_ALCADA'
      : 'ABERTA';

  let opId: bigint | null = null;
  if (params.ordemProducaoId) {
    const op = await prisma.ordemProducao.findFirst({
      where: { id: BigInt(params.ordemProducaoId), empresaId: params.empresaId },
    });
    if (!op) throw new NotFoundError('OP não encontrada');
    opId = op.id;
  }

  const oc = await prisma.$transaction(async (tx) => {
    const codigo = await nextCodigoDocumento(params.empresaId, 'OC', tx);
    return tx.ordemCompra.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        status,
        fornecedorId: forn.id,
        ordemProducaoId: opId,
        urgente: params.urgente ?? false,
        valorTotal: valor.toFixed(2),
        observacoes: params.observacoes ?? null,
        criadoPorId: params.usuarioId,
        aprovadoPorId: status === 'ABERTA' ? params.usuarioId : null,
        aprovadoEm: status === 'ABERTA' ? new Date() : null,
        itens: { create: itensData },
      },
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'CPR.OC.DIRETA',
    entidade: 'OrdemCompra',
    entidadeId: oc.codigo,
    paraJson: { status: oc.status, valor: valor.toFixed(2) },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeOc((await loadOc(params.empresaId, oc.id))!);
}

async function resolverProduto(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  empresaId: bigint,
  cProd: string,
  descricao: string,
  ncm: string | null,
  unidadeCodigo: string,
  mapeamentos: Record<string, string>,
  criarSkuAusente: boolean,
) {
  if (mapeamentos[cProd]) {
    const p = await tx.produto.findFirst({
      where: { id: BigInt(mapeamentos[cProd]), empresaId },
    });
    if (!p) throw new NotFoundError(`Mapeamento inválido para ${cProd}`);
    return p;
  }
  const byCode = await tx.produto.findFirst({
    where: { empresaId, codigo: cProd },
  });
  if (byCode) return byCode;

  if (!criarSkuAusente) {
    throw new AppError(
      'SKU_NAO_MAPEADO',
      `Produto XML ${cProd} sem mapeamento (informe mapeamentos ou criarSkuAusente)`,
      400,
      { cProd },
    );
  }

  let un = await tx.unidadeMedida.findFirst({
    where: { codigo: unidadeCodigo.toUpperCase() },
  });
  if (!un) {
    un = await tx.unidadeMedida.findFirst({ where: { codigo: 'UN' } });
  }
  if (!un) throw new AppError('UNIDADE_PADRAO', 'Unidade UN não cadastrada', 500);

  const codigo = cProd.slice(0, 40);
  return tx.produto.create({
    data: {
      empresaId,
      codigo,
      familia: 'MP',
      descricao: descricao.slice(0, 240),
      ncm: ncm?.replace(/\D/g, '').slice(0, 8) || null,
      unidadeEstoqueId: un.id,
      unidadeComercialId: un.id,
      controlaEstoque: true,
    },
  });
}

export async function importarEConfirmarXmlCompra(params: {
  empresaId: bigint;
  usuarioId: bigint;
  xml: string;
  ordemCompraId?: string | null;
  mapeamentos?: Record<string, string>;
  criarSkuAusente?: boolean;
  permitirSemOc?: boolean;
  perfis: string[];
  permissoes: string[];
  idempotencyKey?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const parsed = parseNfeCompraXml(params.xml);
  const idem =
    params.idempotencyKey?.trim() ||
    `nfc-${parsed.chave44}`;

  const existing = await prisma.nfeCompraEntrada.findUnique({
    where: { idempotencyKey: idem },
    include: { itens: true, fornecedor: true },
  });
  if (existing) {
    return { replay: true as const, entrada: serializeNfe(existing) };
  }
  const byChave = await prisma.nfeCompraEntrada.findUnique({
    where: { chave44: parsed.chave44 },
  });
  if (byChave) {
    throw new AppError('CHAVE_DUPLICADA', 'NF-e de compra já importada', 409);
  }

  const fornecedor = await prisma.parceiro.findFirst({
    where: {
      empresaId: params.empresaId,
      cnpjCpf: parsed.emitenteCnpj,
      papelFornecedor: true,
    },
  });

  let ocId: bigint | null = null;
  if (params.ordemCompraId) {
    const oc = await prisma.ordemCompra.findFirst({
      where: { id: BigInt(params.ordemCompraId), empresaId: params.empresaId },
    });
    if (!oc) throw new NotFoundError('OC não encontrada');
    if (!['ABERTA', 'PARCIAL'].includes(oc.status)) {
      throw new AppError('OC_STATUS', 'OC não está aberta para recebimento', 409);
    }
    ocId = oc.id;
  } else if (!(params.permitirSemOc && (params.perfis.includes('ADMIN') || params.permissoes.includes('cpr.entrada.avulsa')))) {
    throw new AppError(
      'OC_OBRIGATORIA',
      'Informe ordemCompraId ou permitirSemOc com alçada',
      400,
    );
  }

  const maps = params.mapeamentos ?? {};
  const criar = params.criarSkuAusente !== false;

  const result = await prisma.$transaction(async (tx) => {
    const codigo = await nextCodigoDocumento(params.empresaId, 'NFC', tx);
    const nfe = await tx.nfeCompraEntrada.create({
      data: {
        empresaId: params.empresaId,
        codigo,
        status: 'CONFERIDA',
        chave44: parsed.chave44,
        numero: parsed.numero,
        serie: parsed.serie,
        emitenteCnpj: parsed.emitenteCnpj,
        fornecedorId: fornecedor?.id ?? null,
        ordemCompraId: ocId,
        valorTotal: money(parsed.valorTotal).toFixed(2),
        emitidaEm: parsed.emitidaEm,
        xmlRef: `inline://chave/${parsed.chave44}`,
        idempotencyKey: idem,
        conferidoPorId: params.usuarioId,
        conferidoEm: new Date(),
        criadoPorId: params.usuarioId,
      },
    });

    const itensOut = [];
    for (const it of parsed.itens) {
      const produto = await resolverProduto(
        tx,
        params.empresaId,
        it.cProd,
        it.descricao,
        it.ncm,
        it.unidade,
        maps,
        criar,
      );

      const mov = await aplicarMovimento(tx, {
        empresaId: params.empresaId,
        produtoId: produto.id,
        tipo: 'ENTRADA',
        motivo: 'ENTRADA_COMPRA',
        quantidade: qty(it.quantidade),
        custoUnitario: qty(it.valorUnitario, 4),
        motivoTexto: `NF compra ${parsed.chave44} item ${it.sequencia}`,
        criadoPorId: params.usuarioId,
      });

      const nItem = await tx.nfeCompraItem.create({
        data: {
          nfeCompraId: nfe.id,
          sequencia: it.sequencia,
          cProd: it.cProd,
          descricao: it.descricao,
          ncm: it.ncm,
          unidade: it.unidade,
          quantidade: qty(it.quantidade).toFixed(4),
          valorUnitario: qty(it.valorUnitario, 4).toFixed(4),
          valorTotal: money(it.valorTotal).toFixed(2),
          produtoId: produto.id,
          movimentoId: mov.id,
        },
      });
      itensOut.push(nItem);

      if (ocId) {
        const ocItem = await tx.ordemCompraItem.findFirst({
          where: { ordemCompraId: ocId, produtoId: produto.id },
        });
        if (ocItem) {
          const novaRec = qty(ocItem.qtdeRecebida).plus(qty(it.quantidade));
          await tx.ordemCompraItem.update({
            where: { id: ocItem.id },
            data: { qtdeRecebida: novaRec.toFixed(4) },
          });
        }
      }

      // libera OPs aguardando este material
      await tx.ordemProducao.updateMany({
        where: {
          empresaId: params.empresaId,
          status: 'AGUARDANDO_MATERIAL',
          materialFaltaProdutoId: produto.id,
        },
        data: {
          status: 'ABERTA',
          materialFaltaProdutoId: null,
          materialFaltaQtde: null,
          materialFaltaObs: null,
        },
      });
    }

    if (ocId) {
      const ocitens = await tx.ordemCompraItem.findMany({ where: { ordemCompraId: ocId } });
      const allDone = ocitens.every((i) => qty(i.qtdeRecebida).gte(qty(i.quantidade)));
      const any = ocitens.some((i) => qty(i.qtdeRecebida).gt(0));
      await tx.ordemCompra.update({
        where: { id: ocId },
        data: { status: allDone ? 'RECEBIDA' : any ? 'PARCIAL' : 'ABERTA' },
      });
    }

    return tx.nfeCompraEntrada.findUniqueOrThrow({
      where: { id: nfe.id },
      include: { itens: true, fornecedor: true },
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'CPR.XML.ENTRADA',
    entidade: 'NfeCompraEntrada',
    entidadeId: result.codigo,
    paraJson: {
      chave44: parsed.chave44,
      itens: result.itens.length,
      ocId: ocId?.toString() ?? null,
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return { replay: false as const, entrada: serializeNfe(result) };
}

function serializeNfe(
  n: {
    id: bigint;
    codigo: string;
    status: string;
    chave44: string;
    numero: string | null;
    serie: string | null;
    emitenteCnpj: string;
    valorTotal: { toString(): string };
    ordemCompraId: bigint | null;
    fornecedor: { id: bigint; codigo: string; razaoSocial: string } | null;
    itens: Array<{
      id: bigint;
      sequencia: number;
      cProd: string;
      descricao: string;
      quantidade: { toString(): string };
      valorUnitario: { toString(): string };
      produtoId: bigint | null;
      movimentoId: bigint | null;
    }>;
    criadoEm?: Date;
  },
) {
  return {
    id: n.id.toString(),
    codigo: n.codigo,
    status: n.status,
    chave44: n.chave44,
    numero: n.numero,
    serie: n.serie,
    emitenteCnpj: n.emitenteCnpj,
    valorTotal: money(n.valorTotal.toString()).toFixed(2),
    ordemCompraId: n.ordemCompraId?.toString() ?? null,
    fornecedor: n.fornecedor
      ? {
          id: n.fornecedor.id.toString(),
          codigo: n.fornecedor.codigo,
          razaoSocial: n.fornecedor.razaoSocial,
        }
      : null,
    itens: n.itens.map((i) => ({
      id: i.id.toString(),
      sequencia: i.sequencia,
      cProd: i.cProd,
      descricao: i.descricao,
      quantidade: qtyToString(new Decimal(i.quantidade.toString())),
      valorUnitario: new Decimal(i.valorUnitario.toString()).toFixed(4),
      produtoId: i.produtoId?.toString() ?? null,
      movimentoId: i.movimentoId?.toString() ?? null,
    })),
  };
}

export async function listarNfeCompras(empresaId: bigint, limit = 50) {
  const rows = await prisma.nfeCompraEntrada.findMany({
    where: { empresaId },
    include: { itens: true, fornecedor: true },
    orderBy: { id: 'desc' },
    take: Math.min(limit, 100),
  });
  return rows.map(serializeNfe);
}

export async function marcarOpAguardandoMaterial(params: {
  empresaId: bigint;
  usuarioId: bigint;
  ordemProducaoId: bigint;
  produtoId: string;
  quantidade: string;
  observacoes?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  const op = await prisma.ordemProducao.findFirst({
    where: { id: params.ordemProducaoId, empresaId: params.empresaId },
  });
  if (!op) throw new NotFoundError('OP não encontrada');
  if (['CONCLUIDA', 'CANCELADA'].includes(op.status)) {
    throw new AppError('OP_STATUS', 'OP não pode aguardar material neste status', 409);
  }

  const prod = await prisma.produto.findFirst({
    where: { id: BigInt(params.produtoId), empresaId: params.empresaId },
  });
  if (!prod) throw new NotFoundError('Produto não encontrado');

  const updated = await prisma.ordemProducao.update({
    where: { id: op.id },
    data: {
      status: 'AGUARDANDO_MATERIAL',
      materialFaltaProdutoId: prod.id,
      materialFaltaQtde: qty(params.quantidade).toFixed(4),
      materialFaltaObs: params.observacoes ?? null,
    },
    include: { materialFaltaProduto: true },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'CPR.OP.AGUARDA_MATERIAL',
    entidade: 'OrdemProducao',
    entidadeId: updated.codigo,
    paraJson: {
      produto: prod.codigo,
      qtde: qty(params.quantidade).toFixed(4),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    id: updated.id.toString(),
    codigo: updated.codigo,
    status: updated.status,
    materialFalta: {
      produtoId: prod.id.toString(),
      produtoCodigo: prod.codigo,
      quantidade: qtyToString(qty(params.quantidade)),
      observacoes: updated.materialFaltaObs,
    },
  };
}

export async function listarOpsAguardandoMaterial(empresaId: bigint) {
  const rows = await prisma.ordemProducao.findMany({
    where: { empresaId, status: 'AGUARDANDO_MATERIAL' },
    include: { materialFaltaProduto: true, pedido: true },
    orderBy: { id: 'desc' },
  });
  return rows.map((op) => ({
    id: op.id.toString(),
    codigo: op.codigo,
    status: op.status,
    pedido: { id: op.pedido.id.toString(), codigo: op.pedido.codigo },
    materialFalta: op.materialFaltaProduto
      ? {
          produtoId: op.materialFaltaProduto.id.toString(),
          produtoCodigo: op.materialFaltaProduto.codigo,
          quantidade: op.materialFaltaQtde
            ? qtyToString(new Decimal(op.materialFaltaQtde.toString()))
            : null,
          observacoes: op.materialFaltaObs,
        }
      : null,
  }));
}
