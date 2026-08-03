import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../../infrastructure/prisma/client.js';
import {
  AppError,
  ForbiddenError,
  UnauthorizedError,
} from '../../shared/errors/app-error.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';

const MAX_FALHAS = 5;
const LOCK_MINUTES = 15;

function parseExpiresInToDate(expiresIn: string): Date {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  const now = Date.now();
  if (!match) return new Date(now + 8 * 60 * 60 * 1000);
  const n = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return new Date(now + n * mult);
}

export async function login(params: {
  app: FastifyInstance;
  email: string;
  senha: string;
  empresaCodigo?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  jwtExpiresIn: string;
}) {
  const email = params.email.trim().toLowerCase();
  const user = await prisma.usuario.findUnique({
    where: { email },
    include: {
      perfis: { include: { perfil: { include: { permissoes: { include: { permissao: true } } } } } },
      empresas: { include: { empresa: true }, where: { acessoAtivo: true } },
    },
  });

  if (!user) {
    await registrarAuditoria({
      acao: 'LOGIN_FALHA',
      entidade: 'usuario',
      paraJson: { email, motivo: 'CREDENTIAL' },
      ip: params.ip,
      correlationId: params.correlationId,
      sucesso: false,
    });
    throw new UnauthorizedError('Credenciais inválidas');
  }

  if (user.bloqueadoAte && user.bloqueadoAte > new Date()) {
    throw new ForbiddenError('Usuário temporariamente bloqueado por tentativas', 'USER_LOCKED');
  }

  if (user.status !== 'ATIVO') {
    throw new ForbiddenError('Usuário inativo ou bloqueado', 'USER_INACTIVE');
  }

  const ok = await bcrypt.compare(params.senha, user.senhaHash);
  if (!ok) {
    const falhas = user.falhasLogin + 1;
    const data: { falhasLogin: number; bloqueadoAte?: Date } = { falhasLogin: falhas };
    if (falhas >= MAX_FALHAS) {
      data.bloqueadoAte = new Date(Date.now() + LOCK_MINUTES * 60_000);
      data.falhasLogin = 0;
    }
    await prisma.usuario.update({ where: { id: user.id }, data });
    await registrarAuditoria({
      usuarioId: user.id,
      acao: 'LOGIN_FALHA',
      entidade: 'usuario',
      entidadeId: user.id.toString(),
      paraJson: { falhas },
      ip: params.ip,
      correlationId: params.correlationId,
      sucesso: false,
    });
    throw new UnauthorizedError('Credenciais inválidas');
  }

  let empresaRel = user.empresas.find((e) => e.padrao) ?? user.empresas[0];
  if (params.empresaCodigo) {
    const found = user.empresas.find((e) => e.empresa.codigo === params.empresaCodigo);
    if (!found) throw new ForbiddenError('Sem acesso à empresa informada', 'EMPRESA_ACESSO');
    empresaRel = found;
  }
  if (!empresaRel) throw new ForbiddenError('Usuário sem empresa vinculada', 'SEM_EMPRESA');

  const perfis = user.perfis.map((p) => p.perfil.codigo);
  const permissoes = [
    ...new Set(
      user.perfis.flatMap((p) => p.perfil.permissoes.map((pp) => pp.permissao.codigo)),
    ),
  ];

  const jti = randomUUID().replace(/-/g, '');
  const expiraEm = parseExpiresInToDate(params.jwtExpiresIn);

  await prisma.sessao.create({
    data: {
      usuarioId: user.id,
      empresaId: empresaRel.empresaId,
      tokenJti: jti,
      ip: params.ip,
      userAgent: params.userAgent,
      expiraEm,
    },
  });

  await prisma.usuario.update({
    where: { id: user.id },
    data: { falhasLogin: 0, bloqueadoAte: null, ultimoLoginEm: new Date() },
  });

  const token = params.app.jwt.sign({
    sub: user.id.toString(),
    jti,
    empresaId: empresaRel.empresaId.toString(),
    email: user.email,
    perfis,
    permissoes,
  });

  await registrarAuditoria({
    empresaId: empresaRel.empresaId,
    usuarioId: user.id,
    acao: 'LOGIN',
    entidade: 'sessao',
    entidadeId: jti,
    paraJson: { empresa: empresaRel.empresa.codigo, perfis },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    token,
    usuario: {
      id: user.id.toString(),
      email: user.email,
      nome: user.nome,
      perfis,
      permissoes,
    },
    empresa: {
      id: empresaRel.empresa.id.toString(),
      codigo: empresaRel.empresa.codigo,
      razaoSocial: empresaRel.empresa.razaoSocial,
      nomeFantasia: empresaRel.empresa.nomeFantasia,
      cnpj: empresaRel.empresa.cnpj,
      vendaAtiva: empresaRel.empresa.vendaAtiva,
      estoqueAtivo: empresaRel.empresa.estoqueAtivo,
    },
    empresas: user.empresas.map((e) => ({
      id: e.empresa.id.toString(),
      codigo: e.empresa.codigo,
      razaoSocial: e.empresa.razaoSocial,
      nomeFantasia: e.empresa.nomeFantasia,
      cnpj: e.empresa.cnpj,
      vendaAtiva: e.empresa.vendaAtiva,
      padrao: e.padrao,
    })),
  };
}

export async function logout(params: {
  jti: string;
  usuarioId: bigint;
  empresaId: bigint;
  ip?: string;
  correlationId?: string;
}) {
  await prisma.sessao.updateMany({
    where: { tokenJti: params.jti, revogadaEm: null },
    data: { revogadaEm: new Date() },
  });
  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'LOGOUT',
    entidade: 'sessao',
    entidadeId: params.jti,
    ip: params.ip,
    correlationId: params.correlationId,
  });
}

export async function trocarEmpresa(params: {
  app: FastifyInstance;
  usuarioId: bigint;
  empresaCodigo: string;
  jtiAtual: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  jwtExpiresIn: string;
}) {
  const vinculo = await prisma.usuarioEmpresa.findFirst({
    where: {
      usuarioId: params.usuarioId,
      acessoAtivo: true,
      empresa: { codigo: params.empresaCodigo, ativa: true },
    },
    include: {
      empresa: true,
      usuario: {
        include: {
          perfis: {
            include: { perfil: { include: { permissoes: { include: { permissao: true } } } } },
          },
        },
      },
    },
  });

  if (!vinculo) throw new ForbiddenError('Sem acesso à empresa', 'EMPRESA_ACESSO');

  await prisma.sessao.updateMany({
    where: { tokenJti: params.jtiAtual, revogadaEm: null },
    data: { revogadaEm: new Date() },
  });

  const perfis = vinculo.usuario.perfis.map((p) => p.perfil.codigo);
  const permissoes = [
    ...new Set(
      vinculo.usuario.perfis.flatMap((p) =>
        p.perfil.permissoes.map((pp) => pp.permissao.codigo),
      ),
    ),
  ];

  const jti = randomUUID().replace(/-/g, '');
  const expiraEm = parseExpiresInToDate(params.jwtExpiresIn);
  await prisma.sessao.create({
    data: {
      usuarioId: params.usuarioId,
      empresaId: vinculo.empresaId,
      tokenJti: jti,
      ip: params.ip,
      userAgent: params.userAgent,
      expiraEm,
    },
  });

  const token = params.app.jwt.sign({
    sub: params.usuarioId.toString(),
    jti,
    empresaId: vinculo.empresaId.toString(),
    email: vinculo.usuario.email,
    perfis,
    permissoes,
  });

  await registrarAuditoria({
    empresaId: vinculo.empresaId,
    usuarioId: params.usuarioId,
    acao: 'TROCAR_EMPRESA',
    entidade: 'sessao',
    entidadeId: jti,
    paraJson: { empresa: vinculo.empresa.codigo },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    token,
    empresa: {
      id: vinculo.empresa.id.toString(),
      codigo: vinculo.empresa.codigo,
      razaoSocial: vinculo.empresa.razaoSocial,
      nomeFantasia: vinculo.empresa.nomeFantasia,
      cnpj: vinculo.empresa.cnpj,
      vendaAtiva: vinculo.empresa.vendaAtiva,
      estoqueAtivo: vinculo.empresa.estoqueAtivo,
    },
  };
}

export async function assertSessaoAtiva(jti: string) {
  const sessao = await prisma.sessao.findUnique({ where: { tokenJti: jti } });
  if (!sessao || sessao.revogadaEm || sessao.expiraEm < new Date()) {
    throw new UnauthorizedError('Sessão inválida ou expirada');
  }
  return sessao;
}

export function assertPermissao(permissoes: string[], required: string | string[]) {
  const needs = Array.isArray(required) ? required : [required];
  const ok = needs.every((p) => permissoes.includes(p));
  if (!ok) {
    throw new ForbiddenError(`Permissão necessária: ${needs.join(', ')}`, 'RBAC_DENIED');
  }
}

export async function assertVendaPermitida(empresaId: bigint) {
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
  if (!empresa.vendaAtiva) {
    throw new AppError(
      'VENDA_EMPRESA_DESLIGADA',
      `Venda desabilitada para ${empresa.codigo} (aguardar Contador+Direção)`,
      403,
    );
  }
  return empresa;
}
