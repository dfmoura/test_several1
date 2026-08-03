import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import {
  abrirInventario,
  aprovarInventario,
  lancarAjuste,
  listarInventarios,
  listarMovimentos,
  listarSaldos,
  obterSaldoProduto,
  registrarContagensInventario,
  registrarSobraOp,
  separarItemPedido,
  submeterInventario,
} from './estoque.service.js';

const ajusteBody = z.object({
  produtoId: z.string(),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  quantidade: z.string(),
  custoUnitario: z.string().nullable().optional(),
  motivoTexto: z.string().nullable().optional(),
  entradaInicial: z.boolean().optional(),
});

export async function registerEstoqueRoutes(app: FastifyInstance) {
  app.get('/api/v1/estoque/saldos', {
    schema: { tags: ['Estoque'], summary: 'UC-EST — Consultar saldos por SKU' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.saldo.ler');
        const q = request.query as { q?: string; familia?: string; limit?: string };
        return ok(
          reply,
          await listarSaldos({
            empresaId: BigInt(request.user.empresaId),
            q: q.q,
            family: q.familia,
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/estoque/saldos/:produtoId', {
    schema: { tags: ['Estoque'], summary: 'Saldo de um SKU' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.saldo.ler');
        const { produtoId } = request.params as { produtoId: string };
        return ok(
          reply,
          await obterSaldoProduto(
            BigInt(request.user.empresaId),
            BigInt(produtoId),
          ),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/estoque/movimentos', {
    schema: { tags: ['Estoque'], summary: 'Listar movimentos (imutáveis)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.saldo.ler');
        const q = request.query as { produtoId?: string; limit?: string };
        return ok(
          reply,
          await listarMovimentos({
            empresaId: BigInt(request.user.empresaId),
            produtoId: q.produtoId ? BigInt(q.produtoId) : undefined,
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/estoque/ajustes', {
    schema: {
      tags: ['Estoque'],
      summary: 'UC-EST-005/006 simplificado — Entrada/saída de ajuste/inventário',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.movimento.escrever');
        const body = ajusteBody.parse(request.body);
        const data = await lancarAjuste({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          tipo: body.tipo,
          produtoId: BigInt(body.produtoId),
          quantidade: body.quantidade,
          custoUnitario: body.custoUnitario,
          motivoTexto: body.motivoTexto,
          entradaInicial: body.entradaInicial,
          permissoes: request.user.permissoes,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/estoque/pedidos/:pedidoId/itens/:itemId/separar', {
    schema: {
      tags: ['Estoque'],
      summary: 'UC-EST-004 — Separar item PRODUCAO/REVENDA de PED LIBERADO',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.movimento.escrever');
        const { pedidoId, itemId } = request.params as {
          pedidoId: string;
          itemId: string;
        };
        const body = z
          .object({ quantidade: z.string().nullable().optional() })
          .parse(request.body ?? {});
        const data = await separarItemPedido({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          pedidoId: BigInt(pedidoId),
          pedidoItemId: BigInt(itemId),
          quantidade: body.quantidade,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/estoque/inventarios', {
    schema: { tags: ['Estoque'], summary: 'Listar inventários formais' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.saldo.ler');
        const q = request.query as { limit?: string };
        return ok(
          reply,
          await listarInventarios({
            empresaId: BigInt(request.user.empresaId),
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/estoque/inventarios', {
    schema: { tags: ['Estoque'], summary: 'Abrir inventário (snapshot saldos)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.movimento.escrever');
        const data = await abrirInventario({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/estoque/inventarios/:id/itens', {
    schema: { tags: ['Estoque'], summary: 'Registrar contagens do inventário' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.movimento.escrever');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            itens: z
              .array(
                z.object({
                  produtoId: z.string(),
                  qtdeContada: z.string(),
                }),
              )
              .min(1),
          })
          .parse(request.body);
        const data = await registrarContagensInventario({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          inventarioId: BigInt(id),
          itens: body.itens,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/estoque/inventarios/:id/submeter', {
    schema: { tags: ['Estoque'], summary: 'Submeter inventário para aprovação' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.movimento.escrever');
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await submeterInventario({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            inventarioId: BigInt(id),
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/estoque/inventarios/:id/aprovar', {
    schema: { tags: ['Estoque'], summary: 'Aprovar inventário (SoD + AJU MOV)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.inventario.aprovar');
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await aprovarInventario({
            empresaId: BigInt(request.user.empresaId),
            usuarioId: BigInt(request.user.sub),
            inventarioId: BigInt(id),
            permissoes: request.user.permissoes,
            ip: request.ip,
            correlationId: getCorrelationId(request),
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/estoque/ordens-producao/:opId/sobra', {
    schema: { tags: ['Estoque'], summary: 'Registrar sobra/retalho MP da OP' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'est.movimento.escrever');
        const { opId } = request.params as { opId: string };
        const body = z
          .object({
            produtoId: z.string(),
            quantidade: z.string(),
          })
          .parse(request.body);
        const data = await registrarSobraOp({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ordemProducaoId: BigInt(opId),
          produtoId: BigInt(body.produtoId),
          quantidade: body.quantidade,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
