import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import {
  abrirOp,
  abrirOs,
  apontarOp,
  apontarOs,
  concluirOp,
  concluirOs,
  consumirMpOp,
  listarOrdens,
  retornarPaOp,
} from './producao.service.js';

export async function registerProducaoRoutes(app: FastifyInstance) {
  app.get('/api/v1/producao/ordens', {
    schema: { tags: ['Produção'], summary: 'Listar OP/OS' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const q = request.query as { status?: string; limit?: string };
        return ok(
          reply,
          await listarOrdens({
            empresaId: BigInt(request.user.empresaId),
            status: q.status,
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/op', {
    schema: { tags: ['Produção'], summary: 'UC-PRD-001 — Abrir OP' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const body = z
          .object({ pedidoId: z.string(), pedidoItemId: z.string() })
          .parse(request.body);
        return ok(
          reply,
          await abrirOp({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            pedidoId: BigInt(body.pedidoId),
            pedidoItemId: BigInt(body.pedidoItemId),
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
          201,
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/os', {
    schema: { tags: ['Produção'], summary: 'UC-PRD-002 — Abrir OS' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const body = z
          .object({ pedidoId: z.string(), pedidoItemId: z.string() })
          .parse(request.body);
        return ok(
          reply,
          await abrirOs({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            pedidoId: BigInt(body.pedidoId),
            pedidoItemId: BigInt(body.pedidoItemId),
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
          201,
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/op/:id/apontar', {
    schema: { tags: ['Produção'], summary: 'UC-PRD-003 — Apontar OP' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            quantidade: z.string(),
            observacao: z.string().nullable().optional(),
          })
          .parse(request.body);
        return ok(
          reply,
          await apontarOp({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            ordemId: BigInt(id),
            quantidade: body.quantidade,
            observacao: body.observacao,
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/os/:id/apontar', {
    schema: { tags: ['Produção'], summary: 'UC-PRD-003 — Apontar OS' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            quantidade: z.string(),
            observacao: z.string().nullable().optional(),
          })
          .parse(request.body);
        return ok(
          reply,
          await apontarOs({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            ordemId: BigInt(id),
            quantidade: body.quantidade,
            observacao: body.observacao,
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/op/:id/consumir-mp', {
    schema: { tags: ['Produção'], summary: 'UC-EST-001 — Consumo MP na OP' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const { id } = request.params as { id: string };
        const body = z
          .object({ produtoId: z.string(), quantidade: z.string() })
          .parse(request.body);
        return ok(
          reply,
          await consumirMpOp({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            ordemId: BigInt(id),
            produtoId: BigInt(body.produtoId),
            quantidade: body.quantidade,
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/op/:id/retornar-pa', {
    schema: { tags: ['Produção'], summary: 'UC-EST-003 — Retorno PA na OP' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            quantidade: z.string(),
            custoUnitario: z.string().nullable().optional(),
          })
          .parse(request.body);
        return ok(
          reply,
          await retornarPaOp({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            ordemId: BigInt(id),
            quantidade: body.quantidade,
            custoUnitario: body.custoUnitario,
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/op/:id/concluir', {
    schema: { tags: ['Produção'], summary: 'UC-PRD-004 — Concluir OP' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await concluirOp({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            ordemId: BigInt(id),
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/producao/os/:id/concluir', {
    schema: { tags: ['Produção'], summary: 'UC-PRD-004 — Concluir OS' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await concluirOs({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            ordemId: BigInt(id),
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
