import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../../config/env.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { getCorrelationId, ok, sendError } from '../../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
  login,
  logout,
  trocarEmpresa,
} from './auth.service.js';

const loginBody = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  empresaCodigo: z.string().optional(),
});

const trocarEmpresaBody = z.object({
  empresaCodigo: z.string().min(3),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/v1/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'UC-PLT-001 — Autenticar usuário',
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email' },
          senha: { type: 'string' },
          empresaCodigo: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = loginBody.parse(request.body);
        const result = await login({
          app,
          email: body.email,
          senha: body.senha,
          empresaCodigo: body.empresaCodigo,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          correlationId: getCorrelationId(request),
          jwtExpiresIn: env.JWT_EXPIRES_IN,
        });
        return ok(reply, result);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/auth/logout', {
    schema: { tags: ['Auth'], summary: 'Encerrar sessão' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        await logout({
          jti: request.user.jti,
          usuarioId: BigInt(request.user.sub),
          empresaId: BigInt(request.user.empresaId),
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, { ok: true });
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/auth/me', {
    schema: { tags: ['Auth'], summary: 'Sessão atual' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        const user = await prisma.usuario.findUniqueOrThrow({
          where: { id: BigInt(request.user.sub) },
          include: {
            empresas: { include: { empresa: true }, where: { acessoAtivo: true } },
          },
        });
        const empresa = await prisma.empresa.findUniqueOrThrow({
          where: { id: BigInt(request.user.empresaId) },
        });
        return ok(reply, {
          usuario: {
            id: user.id.toString(),
            email: user.email,
            nome: user.nome,
            perfis: request.user.perfis,
            permissoes: request.user.permissoes,
          },
          empresa: {
            id: empresa.id.toString(),
            codigo: empresa.codigo,
            razaoSocial: empresa.razaoSocial,
            nomeFantasia: empresa.nomeFantasia,
            cnpj: empresa.cnpj,
            vendaAtiva: empresa.vendaAtiva,
            estoqueAtivo: empresa.estoqueAtivo,
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
        });
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/auth/trocar-empresa', {
    schema: {
      tags: ['Auth'],
      summary: 'UC-PLT-003 — Trocar empresa da sessão',
      body: {
        type: 'object',
        required: ['empresaCodigo'],
        properties: { empresaCodigo: { type: 'string' } },
      },
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'plt.empresa.trocar');
        const body = trocarEmpresaBody.parse(request.body);
        const result = await trocarEmpresa({
          app,
          usuarioId: BigInt(request.user.sub),
          empresaCodigo: body.empresaCodigo,
          jtiAtual: request.user.jti,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          correlationId: getCorrelationId(request),
          jwtExpiresIn: env.JWT_EXPIRES_IN,
        });
        return ok(reply, result);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
