import { prisma } from '../../../infrastructure/prisma/client.js';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { registrarAuditoria } from '../../plataforma/auditoria/audit.service.js';
import { nextCodigo } from '../shared/codigo.service.js';

export async function listarUnidades() {
  const rows = await prisma.unidadeMedida.findMany({ orderBy: { codigo: 'asc' } });
  return rows.map((u) => ({
    id: u.id.toString(),
    codigo: u.codigo,
    nome: u.nome,
    casasDecimais: u.casasDecimais,
    ativo: u.ativo,
  }));
}

export async function criarUnidade(params: {
  usuarioId: bigint;
  empresaId: bigint;
  codigo: string;
  nome: string;
  casasDecimais?: number;
  ip?: string;
  correlationId?: string;
}) {
  const codigo = params.codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,10}$/.test(codigo)) {
    throw new AppError('UNIDADE_CODIGO_INVALIDO', 'Código de unidade inválido', 400);
  }
  const exists = await prisma.unidadeMedida.findUnique({ where: { codigo } });
  if (exists) throw new ConflictError(`Unidade ${codigo} já existe`, 'UNIDADE_DUPLICADA');

  const row = await prisma.unidadeMedida.create({
    data: {
      codigo,
      nome: params.nome.trim(),
      casasDecimais: params.casasDecimais ?? 4,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'UNIDADE_CRIAR',
    entidade: 'unidade_medida',
    entidadeId: row.id.toString(),
    paraJson: { codigo: row.codigo, nome: row.nome },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    id: row.id.toString(),
    codigo: row.codigo,
    nome: row.nome,
    casasDecimais: row.casasDecimais,
    ativo: row.ativo,
  };
}

export async function listarFacas(params: {
  empresaId: bigint;
  q?: string;
  parceiroClienteId?: bigint;
  limit?: number;
}) {
  const rows = await prisma.faca.findMany({
    where: {
      empresaId: params.empresaId,
      ...(params.parceiroClienteId ? { parceiroClienteId: params.parceiroClienteId } : {}),
      ...(params.q
        ? {
            OR: [
              { codigo: { contains: params.q, mode: 'insensitive' } },
              { descricao: { contains: params.q, mode: 'insensitive' } },
              { modeloRef: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { parceiroCliente: { select: { id: true, codigo: true, razaoSocial: true } } },
    orderBy: { codigo: 'asc' },
    take: params.limit ?? 50,
  });

  return rows.map((f) => ({
    id: f.id.toString(),
    codigo: f.codigo,
    descricao: f.descricao,
    modeloRef: f.modeloRef,
    jaCobrado: f.jaCobrado,
    situacao: f.situacao,
    parceiroCliente: f.parceiroCliente
      ? {
          id: f.parceiroCliente.id.toString(),
          codigo: f.parceiroCliente.codigo,
          razaoSocial: f.parceiroCliente.razaoSocial,
        }
      : null,
    observacoes: f.observacoes,
  }));
}

export async function criarFaca(params: {
  empresaId: bigint;
  usuarioId: bigint;
  input: {
    descricao: string;
    modeloRef?: string | null;
    parceiroClienteId?: string | null;
    observacoes?: string | null;
  };
  ip?: string;
  correlationId?: string;
}) {
  let parceiroClienteId: bigint | null = null;
  if (params.input.parceiroClienteId) {
    const par = await prisma.parceiro.findFirst({
      where: {
        id: BigInt(params.input.parceiroClienteId),
        empresaId: params.empresaId,
        papelCliente: true,
      },
    });
    if (!par) throw new NotFoundError('Cliente do FAC não encontrado');
    parceiroClienteId = par.id;

    if (params.input.modeloRef) {
      const ja = await prisma.faca.findFirst({
        where: {
          empresaId: params.empresaId,
          parceiroClienteId: par.id,
          modeloRef: params.input.modeloRef,
          situacao: 'ATIVO',
          jaCobrado: true,
        },
      });
      if (ja) {
        // não bloqueia criação; só sinaliza — cobrança dupla evitada na ORC/PED
      }
    }
  }

  const codigo = await nextCodigo({ empresaId: params.empresaId, prefixo: 'FAC' });
  const row = await prisma.faca.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      descricao: params.input.descricao.trim(),
      modeloRef: params.input.modeloRef?.trim() || null,
      parceiroClienteId,
      observacoes: params.input.observacoes ?? null,
    },
    include: { parceiroCliente: { select: { id: true, codigo: true, razaoSocial: true } } },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FACA_CRIAR',
    entidade: 'faca',
    entidadeId: row.id.toString(),
    paraJson: { codigo: row.codigo, modeloRef: row.modeloRef },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    id: row.id.toString(),
    codigo: row.codigo,
    descricao: row.descricao,
    modeloRef: row.modeloRef,
    jaCobrado: row.jaCobrado,
    situacao: row.situacao,
    parceiroCliente: row.parceiroCliente
      ? {
          id: row.parceiroCliente.id.toString(),
          codigo: row.parceiroCliente.codigo,
          razaoSocial: row.parceiroCliente.razaoSocial,
        }
      : null,
    observacoes: row.observacoes,
  };
}

export async function consultarCobrancaFaca(params: {
  empresaId: bigint;
  parceiroClienteId: bigint;
  modeloRef: string;
}) {
  const faca = await prisma.faca.findFirst({
    where: {
      empresaId: params.empresaId,
      parceiroClienteId: params.parceiroClienteId,
      modeloRef: params.modeloRef,
      situacao: 'ATIVO',
    },
    orderBy: { criadoEm: 'asc' },
  });

  return {
    elegivelCobranca: !faca?.jaCobrado,
    faca: faca
      ? {
          id: faca.id.toString(),
          codigo: faca.codigo,
          jaCobrado: faca.jaCobrado,
          descricao: faca.descricao,
        }
      : null,
  };
}
