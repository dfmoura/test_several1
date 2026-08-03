import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import {
  baixarTituloManual,
  conciliarBaixaAmbigua,
  emitirCobranca,
  listarCobrancas,
  listarTitulos,
  obterAgingTitulos,
} from './financeiro.service.js';
import {
  confirmarEntrega,
  listarEntregas,
  registrarEntrega,
} from './entrega.service.js';

export async function registerFinanceiroRoutes(app: FastifyInstance) {
  app.get('/api/v1/titulos/aging', {
    schema: { tags: ['Financeiro'], summary: 'Aging de títulos a receber' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fin.titulo.operar');
        return ok(reply, await obterAgingTitulos(BigInt(request.user.empresaId)));
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/titulos', {
    schema: { tags: ['Financeiro'], summary: 'UC-FIN — Listar títulos' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fin.titulo.operar');
        const q = request.query as { status?: string; limit?: string };
        return ok(
          reply,
          await listarTitulos({
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

  app.post('/api/v1/titulos/:id/baixar', {
    schema: { tags: ['Financeiro'], summary: 'UC-FIN-003 — Baixa manual (idempotente)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fin.titulo.operar');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            valor: z.string().nullable().optional(),
            baixadoEm: z.string().nullable().optional(),
            forma: z.string().nullable().optional(),
            observacoes: z.string().nullable().optional(),
            idempotencyKey: z.string().nullable().optional(),
          })
          .parse(request.body ?? {});
        const data = await baixarTituloManual({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          tituloId: BigInt(id),
          valor: body.valor,
          baixadoEm: body.baixadoEm,
          forma: body.forma,
          observacoes: body.observacoes,
          idempotencyKey: body.idempotencyKey,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, data.replay ? 200 : 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/titulos/:id/cobrancas', {
    schema: { tags: ['Financeiro'], summary: 'UC-FIN-002 — Emitir COB (bank stub)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fin.titulo.operar');
        const { id } = request.params as { id: string };
        const body = z
          .object({ idempotencyKey: z.string().nullable().optional() })
          .parse(request.body ?? {});
        const data = await emitirCobranca({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          tituloId: BigInt(id),
          idempotencyKey: body.idempotencyKey,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, data.replay ? 200 : 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/cobrancas', {
    schema: { tags: ['Financeiro'], summary: 'Listar cobranças' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fin.titulo.operar');
        const q = request.query as { tituloId?: string; limit?: string };
        return ok(
          reply,
          await listarCobrancas({
            empresaId: BigInt(request.user.empresaId),
            tituloId: q.tituloId ? BigInt(q.tituloId) : undefined,
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/financeiro/baixas-ambiguas/:id/conciliar', {
    schema: { tags: ['Financeiro'], summary: 'Conciliar baixa ambígua com TIT' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fin.titulo.operar');
        const { id } = request.params as { id: string };
        const body = z.object({ tituloId: z.string() }).parse(request.body);
        return ok(
          reply,
          await conciliarBaixaAmbigua({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            baixaAmbiguaId: BigInt(id),
            tituloId: BigInt(body.tituloId),
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

  app.get('/api/v1/entregas', {
    schema: { tags: ['Expedição'], summary: 'UC-FIN-010 — Listar ENT' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.pedido.escrever');
        const q = request.query as { limit?: string };
        return ok(
          reply,
          await listarEntregas({
            empresaId: BigInt(request.user.empresaId),
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/pedidos/:id/entregas', {
    schema: {
      tags: ['Expedição'],
      summary: 'UC-FIN-010 — Registrar/confirmar entrega (romaneio mínimo)',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.pedido.escrever');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            volumes: z.number().int().positive().optional(),
            observacoes: z.string().nullable().optional(),
            confirmarAgora: z.boolean().optional(),
          })
          .parse(request.body ?? {});
        const data = await registrarEntrega({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          pedidoId: BigInt(id),
          volumes: body.volumes,
          observacoes: body.observacoes,
          confirmarAgora: body.confirmarAgora,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/entregas/:id/confirmar', {
    schema: { tags: ['Expedição'], summary: 'Confirmar recebimento da ENT' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.pedido.escrever');
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await confirmarEntrega({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            entregaId: BigInt(id),
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
