import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import {
  aprovarOrdemCompra,
  criarCotacao,
  criarOcDireta,
  gerarOcDaCotacao,
  importarEConfirmarXmlCompra,
  listarCotacoes,
  listarNfeCompras,
  listarOpsAguardandoMaterial,
  listarOrdensCompra,
  marcarOpAguardandoMaterial,
  registrarProposta,
} from './compras.service.js';

export async function registerComprasRoutes(app: FastifyInstance) {
  app.get('/api/v1/compras/cotacoes', {
    schema: { tags: ['Compras'], summary: 'UC-CPR-001 — Listar cotações' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.ler');
        return ok(reply, await listarCotacoes(BigInt(request.user.empresaId)));
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/compras/cotacoes', {
    schema: { tags: ['Compras'], summary: 'UC-CPR-001 — Criar COT' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.escrever');
        const body = z
          .object({
            urgente: z.boolean().optional(),
            ordemProducaoId: z.string().nullable().optional(),
            observacoes: z.string().nullable().optional(),
            itens: z
              .array(
                z.object({
                  produtoId: z.string(),
                  quantidade: z.string(),
                }),
              )
              .min(1),
          })
          .parse(request.body);
        const data = await criarCotacao({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ...body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/compras/cotacoes/:id/propostas', {
    schema: { tags: ['Compras'], summary: 'Registrar proposta de fornecedor' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.escrever');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            fornecedorId: z.string(),
            precoUnitario: z.string(),
            prazoDias: z.number().int().optional(),
            frete: z.string().optional(),
            observacoes: z.string().nullable().optional(),
          })
          .parse(request.body);
        const data = await registrarProposta({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          cotacaoId: BigInt(id),
          ...body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/compras/cotacoes/:id/gerar-oc', {
    schema: { tags: ['Compras'], summary: 'UC-CPR-002 — Gerar OC da proposta vencedora' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.escrever');
        const { id } = request.params as { id: string };
        const body = z.object({ propostaId: z.string() }).parse(request.body);
        const data = await gerarOcDaCotacao({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          cotacaoId: BigInt(id),
          propostaId: body.propostaId,
          perfis: request.user.perfis,
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

  app.get('/api/v1/compras/ordens', {
    schema: { tags: ['Compras'], summary: 'Listar OC' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.ler');
        return ok(reply, await listarOrdensCompra(BigInt(request.user.empresaId)));
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/compras/ordens', {
    schema: { tags: ['Compras'], summary: 'UC-CPR-002/003 — OC direta (com alçada)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.escrever');
        const body = z
          .object({
            fornecedorId: z.string(),
            urgente: z.boolean().optional(),
            ordemProducaoId: z.string().nullable().optional(),
            observacoes: z.string().nullable().optional(),
            itens: z
              .array(
                z.object({
                  produtoId: z.string(),
                  quantidade: z.string(),
                  precoUnitario: z.string(),
                }),
              )
              .min(1),
          })
          .parse(request.body);
        const data = await criarOcDireta({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ...body,
          perfis: request.user.perfis,
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

  app.post('/api/v1/compras/ordens/:id/aprovar', {
    schema: { tags: ['Compras'], summary: 'UC-CPR-003 — Aprovar OC acima da alçada' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.alcada.aprovar');
        const { id } = request.params as { id: string };
        const data = await aprovarOrdemCompra({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ordemCompraId: BigInt(id),
          perfis: request.user.perfis,
          permissoes: request.user.permissoes,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/compras/entradas', {
    schema: { tags: ['Compras'], summary: 'Listar NF-e compra conferidas' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.ler');
        return ok(reply, await listarNfeCompras(BigInt(request.user.empresaId)));
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/compras/entradas/xml', {
    schema: {
      tags: ['Compras'],
      summary: 'UC-CPR-004 — Importar XML compra + confirmar + MOV ENTRADA_COMPRA',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.escrever');
        const body = z
          .object({
            xml: z.string().min(20),
            ordemCompraId: z.string().nullable().optional(),
            mapeamentos: z.record(z.string()).optional(),
            criarSkuAusente: z.boolean().optional(),
            permitirSemOc: z.boolean().optional(),
            idempotencyKey: z.string().nullable().optional(),
          })
          .parse(request.body);
        const data = await importarEConfirmarXmlCompra({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ...body,
          perfis: request.user.perfis,
          permissoes: request.user.permissoes,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, data.replay ? 200 : 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/compras/ops-aguardando-material', {
    schema: { tags: ['Compras'], summary: 'UC-CPR-005 — OPs paradas por material' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cpr.ler');
        return ok(
          reply,
          await listarOpsAguardandoMaterial(BigInt(request.user.empresaId)),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/compras/ordens-producao/:opId/aguardar-material', {
    schema: { tags: ['Compras'], summary: 'UC-CPR-005 — Marcar OP aguardando material' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'prd.op.operar');
        const { opId } = request.params as { opId: string };
        const body = z
          .object({
            produtoId: z.string(),
            quantidade: z.string(),
            observacoes: z.string().nullable().optional(),
          })
          .parse(request.body);
        const data = await marcarOpAguardandoMaterial({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ordemProducaoId: BigInt(opId),
          ...body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
