import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import {
  consultarCredito,
  converterOrcamentoEmPedido,
  criarOrcamento,
  enviarOrcamentoAceite,
  liberarCreditoPedido,
  listarOrcamentos,
  listarPedidos,
  obterOrcamento,
  obterPropostaPublica,
  processarAceitePublico,
  solicitarAdiantamentoPedido,
} from './comercial.service.js';

const itemSchema = z.object({
  produtoId: z.string().nullable().optional(),
  descricao: z.string().optional(),
  tipoItem: z.enum(['PRODUCAO', 'SERVICO', 'REVENDA']).optional(),
  quantidade: z.string(),
  unidadeCodigo: z.string().optional(),
  precoUnitario: z.string().optional(),
  descontoPct: z.string().optional(),
  custoInternoUnitario: z.string().nullable().optional(),
  specJson: z.record(z.unknown()).nullable().optional(),
});

const cenarioSchema = z.object({
  label: z.string(),
  ativo: z.boolean().optional(),
  itens: z.array(itemSchema).min(1),
});

const orcBody = z.object({
  parceiroId: z.string(),
  condicaoPagamento: z.string().nullable().optional(),
  prazoDias: z.number().int().positive().optional(),
  observacoesCliente: z.string().nullable().optional(),
  observacoesInternas: z.string().nullable().optional(),
  gorduraPct: z.string().optional(),
  descontoPct: z.string().optional(),
  facaId: z.string().nullable().optional(),
  itens: z.array(itemSchema).optional(),
  cenarios: z.array(cenarioSchema).optional(),
}).refine((b) => (b.itens?.length ?? 0) > 0 || (b.cenarios?.length ?? 0) > 0, {
  message: 'Informe itens ou cenarios',
});

export async function registerComercialRoutes(app: FastifyInstance) {
  app.get('/api/v1/orcamentos', {
    schema: { tags: ['Comercial'], summary: 'UC-COM-001 — Listar orçamentos' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.orcamento.escrever');
        const q = request.query as { status?: string; q?: string; limit?: string };
        return ok(
          reply,
          await listarOrcamentos({
            empresaId: BigInt(request.user.empresaId),
            status: q.status,
            q: q.q,
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/orcamentos/:id', {
    schema: { tags: ['Comercial'], summary: 'Obter orçamento' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.orcamento.escrever');
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await obterOrcamento(BigInt(request.user.empresaId), BigInt(id), true),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/orcamentos', {
    schema: { tags: ['Comercial'], summary: 'UC-COM-001 — Criar ORC' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.orcamento.escrever');
        const body = orcBody.parse(request.body);
        const data = await criarOrcamento({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          perfis: request.user.perfis,
          input: { ...body, itens: body.itens ?? [] },
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/orcamentos/:id/enviar-aceite', {
    schema: { tags: ['Comercial'], summary: 'UC-COM-005 — Enviar link de aceite' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.orcamento.escrever');
        const { id } = request.params as { id: string };
        const body = z
          .object({ validadeHoras: z.number().int().positive().optional() })
          .parse(request.body ?? {});
        const publicBase =
          process.env.PUBLIC_WEB_URL ?? env.CORS_ORIGIN.split(',')[0] ?? 'http://localhost:5175';
        const data = await enviarOrcamentoAceite({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          orcamentoId: BigInt(id),
          validadeHoras: body.validadeHoras,
          publicBaseUrl: publicBase,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/orcamentos/:id/converter-pedido', {
    schema: { tags: ['Comercial'], summary: 'UC-COM-006 — Converter ORC aprovado em PED' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.pedido.escrever');
        const { id } = request.params as { id: string };
        const data = await converterOrcamentoEmPedido({
          empresaId: BigInt(request.user.empresaId),
          orcamentoId: BigInt(id),
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

  // --- Público (sem JWT) ---
  app.get('/api/v1/publico/aceite/:token', {
    schema: { tags: ['Público'], summary: 'Abrir proposta do cliente' },
    handler: async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        return ok(reply, await obterPropostaPublica(token));
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/publico/aceite/:token', {
    schema: { tags: ['Público'], summary: 'Aceitar ou recusar proposta' },
    handler: async (request, reply) => {
      try {
        const { token } = request.params as { token: string };
        const body = z
          .object({
            acao: z.enum(['APROVAR', 'RECUSAR']),
            motivoRecusa: z.string().nullable().optional(),
          })
          .parse(request.body);
        const data = await processarAceitePublico({
          token,
          acao: body.acao,
          motivoRecusa: body.motivoRecusa,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  // --- Pedidos ---
  app.get('/api/v1/pedidos', {
    schema: { tags: ['Comercial'], summary: 'Listar pedidos' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.pedido.escrever');
        const q = request.query as { status?: string; limit?: string };
        return ok(
          reply,
          await listarPedidos({
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

  app.post('/api/v1/pedidos/:id/liberar-credito', {
    schema: { tags: ['Comercial'], summary: 'UC-COM-008 — Liberar crédito (FINANCEIRO)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fin.credito.alterar');
        const { id } = request.params as { id: string };
        const body = z
          .object({ motivo: z.string().nullable().optional() })
          .parse(request.body ?? {});
        const data = await liberarCreditoPedido({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          pedidoId: BigInt(id),
          motivo: body.motivo,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/pedidos/:id/solicitar-adiantamento', {
    schema: { tags: ['Comercial'], summary: 'UC-COM-009 — Solicitar adiantamento (TIT sinal)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'com.pedido.escrever');
        const { id } = request.params as { id: string };
        const body = z
          .object({ valorPct: z.string().optional() })
          .parse(request.body ?? {});
        const data = await solicitarAdiantamentoPedido({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          pedidoId: BigInt(id),
          valorPct: body.valorPct,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/parceiros/:id/credito', {
    schema: { tags: ['Comercial'], summary: 'UC-COM-007 — Consultar crédito' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        const perms = request.user.permissoes;
        const pode =
          perms.includes('com.pedido.escrever') ||
          perms.includes('fin.credito.alterar') ||
          perms.includes('cad.parceiro.ler');
        if (!pode) assertPermissao(perms, 'com.pedido.escrever');
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await consultarCredito(BigInt(request.user.empresaId), BigInt(id)),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
