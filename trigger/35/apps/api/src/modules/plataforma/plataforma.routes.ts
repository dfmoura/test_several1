import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/prisma/client.js';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import { assertPermissao, assertSessaoAtiva } from './auth/auth.service.js';
import { registrarAuditoria } from './auditoria/audit.service.js';
import { ForbiddenError, NotFoundError } from '../shared/errors/app-error.js';

const patchParamBody = z.object({
  valor: z.string().min(1),
  confirmarRatificacao: z.boolean().optional(),
});

export async function registerPlataformaRoutes(app: FastifyInstance) {
  app.get('/api/v1/empresas', {
    schema: { tags: ['Empresa'], summary: 'Listar empresas acessíveis' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        const rows = await prisma.usuarioEmpresa.findMany({
          where: { usuarioId: BigInt(request.user.sub), acessoAtivo: true },
          include: { empresa: true },
        });
        return ok(
          reply,
          rows.map((r) => ({
            id: r.empresa.id.toString(),
            codigo: r.empresa.codigo,
            razaoSocial: r.empresa.razaoSocial,
            nomeFantasia: r.empresa.nomeFantasia,
            cnpj: r.empresa.cnpj,
            vendaAtiva: r.empresa.vendaAtiva,
            estoqueAtivo: r.empresa.estoqueAtivo,
            padrao: r.padrao,
          })),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/parametros', {
    schema: { tags: ['Parâmetros'], summary: 'UC-PLT-005 — Listar parâmetros da empresa da sessão' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'plt.parametro.ler');
        const empresaId = BigInt(request.user.empresaId);
        const params = await prisma.parametroEmpresa.findMany({
          where: { empresaId },
          orderBy: { chave: 'asc' },
        });
        return ok(
          reply,
          params.map((p) => ({
            id: p.id.toString(),
            chave: p.chave,
            valor: p.valor,
            tipo: p.tipo,
            descricao: p.descricao,
            statusRatificacao: p.statusRatificacao,
          })),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.patch('/api/v1/parametros/:chave', {
    schema: {
      tags: ['Parâmetros'],
      summary: 'Alterar parâmetro (ADMIN) com auditoria de→para',
      params: {
        type: 'object',
        required: ['chave'],
        properties: { chave: { type: 'string' } },
      },
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'plt.parametro.gerir');
        const { chave } = request.params as { chave: string };
        const body = patchParamBody.parse(request.body);
        const empresaId = BigInt(request.user.empresaId);

        const atual = await prisma.parametroEmpresa.findUnique({
          where: { empresaId_chave: { empresaId, chave } },
        });
        if (!atual) throw new NotFoundError('Parâmetro não encontrado');
        if (atual.statusRatificacao === 'FIXO') {
          throw new ForbiddenError('Parâmetro fixo (não alterável)', 'PARAM_FIXO');
        }

        const statusRatificacao =
          body.confirmarRatificacao === true ? 'RATIFICADO' : atual.statusRatificacao;

        const updated = await prisma.parametroEmpresa.update({
          where: { id: atual.id },
          data: { valor: body.valor, statusRatificacao },
        });

        await registrarAuditoria({
          empresaId,
          usuarioId: BigInt(request.user.sub),
          acao: 'PARAMETRO_ALTERAR',
          entidade: 'parametro_empresa',
          entidadeId: atual.id.toString(),
          deJson: { chave, valor: atual.valor, status: atual.statusRatificacao },
          paraJson: {
            chave,
            valor: updated.valor,
            status: updated.statusRatificacao,
          },
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });

        return ok(reply, {
          id: updated.id.toString(),
          chave: updated.chave,
          valor: updated.valor,
          tipo: updated.tipo,
          descricao: updated.descricao,
          statusRatificacao: updated.statusRatificacao,
        });
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/auditoria', {
    schema: {
      tags: ['Auditoria'],
      summary: 'UC-PLT-004 — Consultar trilha de auditoria',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
          entidade: { type: 'string' },
        },
      },
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'plt.auditoria.ler');
        const q = request.query as { limit?: number; entidade?: string };
        const limit = q.limit ?? 50;
        const logs = await prisma.auditLog.findMany({
          where: {
            empresaId: BigInt(request.user.empresaId),
            ...(q.entidade ? { entidade: q.entidade } : {}),
          },
          orderBy: { ocorridoEm: 'desc' },
          take: limit,
          include: { usuario: { select: { email: true, nome: true } } },
        });
        return ok(
          reply,
          logs.map((l) => ({
            id: l.id.toString(),
            ocorridoEm: l.ocorridoEm,
            acao: l.acao,
            entidade: l.entidade,
            entidadeId: l.entidadeId,
            deJson: l.deJson,
            paraJson: l.paraJson,
            sucesso: l.sucesso,
            usuario: l.usuario
              ? { email: l.usuario.email, nome: l.usuario.nome }
              : null,
            ip: l.ip,
            correlationId: l.correlationId,
          })),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/perfis', {
    schema: { tags: ['RBAC'], summary: 'Listar perfis (RBAC)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'plt.usuario.gerir');
        const perfis = await prisma.perfil.findMany({
          include: {
            permissoes: { include: { permissao: true } },
            _count: { select: { usuarios: true } },
          },
          orderBy: { codigo: 'asc' },
        });
        return ok(
          reply,
          perfis.map((p) => ({
            id: p.id.toString(),
            codigo: p.codigo,
            nome: p.nome,
            descricao: p.descricao,
            usuarios: p._count.usuarios,
            permissoes: p.permissoes.map((pp) => pp.permissao.codigo),
          })),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
