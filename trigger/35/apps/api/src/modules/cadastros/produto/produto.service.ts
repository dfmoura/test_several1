import type { FamiliaProduto, Prisma } from '@prisma/client';
import { Decimal } from '../../shared/decimal/money.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { registrarAuditoria } from '../../plataforma/auditoria/audit.service.js';
import { nextCodigo } from '../shared/codigo.service.js';

const includeFull = {
  unidadeEstoque: true,
  unidadeComercial: true,
  fatores: { include: { unidadeDe: true, unidadePara: true } },
} as const;

const PREFIXO_FAMILIA: Record<FamiliaProduto, string> = {
  MP: 'MP',
  EMB: 'EMB',
  REV: 'REV',
  PA: 'PA',
  SVC: 'SVC',
};

export type ProdutoCreateInput = {
  familia: FamiliaProduto;
  codigo?: string;
  descricao: string;
  ncm?: string | null;
  cest?: string | null;
  origem?: string;
  unidadeEstoqueCodigo: string;
  unidadeComercialCodigo: string;
  controlaEstoque?: boolean;
  mascaraJson?: Prisma.InputJsonValue | null;
  csosnPadrao?: string | null;
  cfopPadraoDentro?: string | null;
  cfopPadraoFora?: string | null;
  precoTabela?: string | null;
  observacoes?: string | null;
  fator?: {
    unidadeDeCodigo: string;
    unidadeParaCodigo: string;
    fator: string;
  } | null;
};

function serializeProduto(p: Prisma.ProdutoGetPayload<{ include: typeof includeFull }>) {
  return {
    id: p.id.toString(),
    empresaId: p.empresaId.toString(),
    codigo: p.codigo,
    familia: p.familia,
    descricao: p.descricao,
    ncm: p.ncm,
    cest: p.cest,
    origem: p.origem,
    unidadeEstoque: { id: p.unidadeEstoque.id.toString(), codigo: p.unidadeEstoque.codigo },
    unidadeComercial: {
      id: p.unidadeComercial.id.toString(),
      codigo: p.unidadeComercial.codigo,
    },
    controlaEstoque: p.controlaEstoque,
    mascaraJson: p.mascaraJson,
    csosnPadrao: p.csosnPadrao,
    cfopPadraoDentro: p.cfopPadraoDentro,
    cfopPadraoFora: p.cfopPadraoFora,
    precoTabela: p.precoTabela?.toString() ?? null,
    situacao: p.situacao,
    observacoes: p.observacoes,
    fatores: p.fatores.map((f) => ({
      id: f.id.toString(),
      de: f.unidadeDe.codigo,
      para: f.unidadePara.codigo,
      fator: f.fator.toString(),
      vigenciaInicio: f.vigenciaInicio,
      vigenciaFim: f.vigenciaFim,
    })),
    criadoEm: p.criadoEm,
    atualizadoEm: p.atualizadoEm,
  };
}

async function resolveUnidade(codigo: string) {
  const u = await prisma.unidadeMedida.findUnique({ where: { codigo: codigo.toUpperCase() } });
  if (!u || !u.ativo) throw new AppError('UNIDADE_INVALIDA', `Unidade ${codigo} inválida`, 400);
  return u;
}

function assertFamiliaRegras(familia: FamiliaProduto, input: ProdutoCreateInput) {
  if (familia === 'SVC') {
    // serviço não exige estoque físico
  } else if ((familia === 'MP' || familia === 'EMB') && input.mascaraJson == null) {
    // máscara recomendada para bobina; não bloqueia se não for bobina — soft check via NCM
  }
  if (input.ncm && !/^\d{8}$/.test(input.ncm)) {
    throw new AppError('NCM_INVALIDO', 'NCM deve ter 8 dígitos', 400);
  }
}

export async function listarProdutos(params: {
  empresaId: bigint;
  q?: string;
  familia?: FamiliaProduto;
  situacao?: string;
  limit?: number;
}) {
  const where: Prisma.ProdutoWhereInput = { empresaId: params.empresaId };
  if (params.familia) where.familia = params.familia;
  if (params.situacao) where.situacao = params.situacao as never;
  if (params.q) {
    where.OR = [
      { codigo: { contains: params.q, mode: 'insensitive' } },
      { descricao: { contains: params.q, mode: 'insensitive' } },
      { ncm: { contains: params.q } },
    ];
  }
  const rows = await prisma.produto.findMany({
    where,
    include: includeFull,
    orderBy: { codigo: 'asc' },
    take: params.limit ?? 50,
  });
  return rows.map(serializeProduto);
}

export async function obterProduto(empresaId: bigint, id: bigint) {
  const p = await prisma.produto.findFirst({
    where: { id, empresaId },
    include: includeFull,
  });
  if (!p) throw new NotFoundError('Produto não encontrado');
  return serializeProduto(p);
}

export async function criarProduto(params: {
  empresaId: bigint;
  usuarioId: bigint;
  input: ProdutoCreateInput;
  ip?: string;
  correlationId?: string;
}) {
  const input = params.input;
  assertFamiliaRegras(input.familia, input);

  const ue = await resolveUnidade(input.unidadeEstoqueCodigo);
  const uc = await resolveUnidade(input.unidadeComercialCodigo);
  let fatorDe = null as Awaited<ReturnType<typeof resolveUnidade>> | null;
  let fatorPara = null as Awaited<ReturnType<typeof resolveUnidade>> | null;
  let fatorValor: Decimal | null = null;
  if (input.fator) {
    fatorDe = await resolveUnidade(input.fator.unidadeDeCodigo);
    fatorPara = await resolveUnidade(input.fator.unidadeParaCodigo);
    fatorValor = new Decimal(input.fator.fator);
    if (!fatorValor.isPositive()) {
      throw new AppError('FATOR_INVALIDO', 'Fator de conversão deve ser > 0', 400);
    }
  }

  let codigo = input.codigo?.trim().toUpperCase();
  if (codigo) {
    const dup = await prisma.produto.findFirst({
      where: { empresaId: params.empresaId, codigo },
    });
    if (dup) throw new ConflictError(`Código ${codigo} já existe`, 'PRODUTO_CODIGO_DUPLICADO');
  } else {
    codigo = await nextCodigo({
      empresaId: params.empresaId,
      prefixo: PREFIXO_FAMILIA[input.familia],
    });
  }

  const controlaEstoque = input.controlaEstoque ?? input.familia !== 'SVC';
  const preco = input.precoTabela ? new Decimal(input.precoTabela) : null;
  if (preco && preco.isNegative()) {
    throw new AppError('PRECO_INVALIDO', 'Preço não pode ser negativo', 400);
  }

  const created = await prisma.$transaction(async (tx) => {
    const produto = await tx.produto.create({
      data: {
        empresaId: params.empresaId,
        codigo: codigo!,
        familia: input.familia,
        descricao: input.descricao.trim(),
        ncm: input.ncm ?? null,
        cest: input.cest ?? null,
        origem: input.origem ?? '0',
        unidadeEstoqueId: ue.id,
        unidadeComercialId: uc.id,
        controlaEstoque,
        mascaraJson: input.mascaraJson ?? undefined,
        csosnPadrao: input.csosnPadrao ?? null,
        cfopPadraoDentro: input.cfopPadraoDentro ?? null,
        cfopPadraoFora: input.cfopPadraoFora ?? null,
        precoTabela: preco ? preco.toFixed(4) : null,
        observacoes: input.observacoes ?? null,
      },
    });

    if (fatorDe && fatorPara && fatorValor) {
      await tx.fatorConversao.create({
        data: {
          produtoId: produto.id,
          unidadeDeId: fatorDe.id,
          unidadeParaId: fatorPara.id,
          fator: fatorValor.toFixed(10),
        },
      });
    }

    return tx.produto.findUniqueOrThrow({
      where: { id: produto.id },
      include: includeFull,
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRODUTO_CRIAR',
    entidade: 'produto',
    entidadeId: created.id.toString(),
    paraJson: { codigo: created.codigo, familia: created.familia },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeProduto(created);
}

export async function atualizarProduto(params: {
  empresaId: bigint;
  usuarioId: bigint;
  id: bigint;
  input: Partial<ProdutoCreateInput> & { situacao?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO' };
  ip?: string;
  correlationId?: string;
}) {
  const atual = await prisma.produto.findFirst({
    where: { id: params.id, empresaId: params.empresaId },
    include: includeFull,
  });
  if (!atual) throw new NotFoundError('Produto não encontrado');

  let unidadeEstoqueId = atual.unidadeEstoqueId;
  let unidadeComercialId = atual.unidadeComercialId;
  if (params.input.unidadeEstoqueCodigo) {
    unidadeEstoqueId = (await resolveUnidade(params.input.unidadeEstoqueCodigo)).id;
  }
  if (params.input.unidadeComercialCodigo) {
    unidadeComercialId = (await resolveUnidade(params.input.unidadeComercialCodigo)).id;
  }

  if (params.input.ncm && !/^\d{8}$/.test(params.input.ncm)) {
    throw new AppError('NCM_INVALIDO', 'NCM deve ter 8 dígitos', 400);
  }

  const situacao = params.input.situacao ?? atual.situacao;
  const preco =
    params.input.precoTabela !== undefined
      ? params.input.precoTabela
        ? new Decimal(params.input.precoTabela).toFixed(4)
        : null
      : undefined;

  const updated = await prisma.produto.update({
    where: { id: atual.id },
    data: {
      descricao: params.input.descricao?.trim() ?? atual.descricao,
      ncm: params.input.ncm !== undefined ? params.input.ncm : atual.ncm,
      cest: params.input.cest !== undefined ? params.input.cest : atual.cest,
      origem: params.input.origem ?? atual.origem,
      unidadeEstoqueId,
      unidadeComercialId,
      controlaEstoque: params.input.controlaEstoque ?? atual.controlaEstoque,
      mascaraJson:
        params.input.mascaraJson !== undefined ? params.input.mascaraJson ?? undefined : undefined,
      csosnPadrao:
        params.input.csosnPadrao !== undefined ? params.input.csosnPadrao : atual.csosnPadrao,
      cfopPadraoDentro:
        params.input.cfopPadraoDentro !== undefined
          ? params.input.cfopPadraoDentro
          : atual.cfopPadraoDentro,
      cfopPadraoFora:
        params.input.cfopPadraoFora !== undefined ? params.input.cfopPadraoFora : atual.cfopPadraoFora,
      ...(preco !== undefined ? { precoTabela: preco } : {}),
      observacoes:
        params.input.observacoes !== undefined ? params.input.observacoes : atual.observacoes,
      situacao,
      inativadoEm: situacao === 'INATIVO' ? new Date() : null,
    },
    include: includeFull,
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRODUTO_ATUALIZAR',
    entidade: 'produto',
    entidadeId: atual.id.toString(),
    deJson: { situacao: atual.situacao, descricao: atual.descricao },
    paraJson: { situacao: updated.situacao, descricao: updated.descricao },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeProduto(updated);
}

export async function adicionarFator(params: {
  empresaId: bigint;
  usuarioId: bigint;
  produtoId: bigint;
  unidadeDeCodigo: string;
  unidadeParaCodigo: string;
  fator: string;
  ip?: string;
  correlationId?: string;
}) {
  const produto = await prisma.produto.findFirst({
    where: { id: params.produtoId, empresaId: params.empresaId },
  });
  if (!produto) throw new NotFoundError('Produto não encontrado');

  const de = await resolveUnidade(params.unidadeDeCodigo);
  const para = await resolveUnidade(params.unidadeParaCodigo);
  const fator = new Decimal(params.fator);
  if (!fator.isPositive()) {
    throw new AppError('FATOR_INVALIDO', 'Fator de conversão deve ser > 0', 400);
  }

  // encerra fator anterior mesmo par
  await prisma.fatorConversao.updateMany({
    where: {
      produtoId: produto.id,
      unidadeDeId: de.id,
      unidadeParaId: para.id,
      vigenciaFim: null,
    },
    data: { vigenciaFim: new Date() },
  });

  const row = await prisma.fatorConversao.create({
    data: {
      produtoId: produto.id,
      unidadeDeId: de.id,
      unidadeParaId: para.id,
      fator: fator.toFixed(10),
    },
    include: { unidadeDe: true, unidadePara: true },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PRODUTO_FATOR_CRIAR',
    entidade: 'fator_conversao',
    entidadeId: row.id.toString(),
    paraJson: {
      produto: produto.codigo,
      de: row.unidadeDe.codigo,
      para: row.unidadePara.codigo,
      fator: row.fator.toString(),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    id: row.id.toString(),
    de: row.unidadeDe.codigo,
    para: row.unidadePara.codigo,
    fator: row.fator.toString(),
    vigenciaInicio: row.vigenciaInicio,
  };
}
