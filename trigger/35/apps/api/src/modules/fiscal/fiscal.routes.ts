import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import {
  cancelarDocumentoFiscal,
  emitirCceDocumentoFiscal,
  emitirDocumentoFiscal,
  listarDocumentosFiscais,
  obterArtefatosDocumentoFiscal,
  obterDocumentoFiscal,
} from './fiscal.service.js';
import { ForbiddenError } from '../shared/errors/app-error.js';

function assertPodeLerNf(permissoes: string[]) {
  if (
    permissoes.includes('fis.nf.emitir') ||
    permissoes.includes('fis.nf.ler') ||
    permissoes.includes('plt.auditoria.ler')
  ) {
    return;
  }
  throw new ForbiddenError('Sem permissão para consultar NF');
}

export async function registerFiscalRoutes(app: FastifyInstance) {
  app.get('/api/v1/documentos-fiscais', {
    schema: { tags: ['Fiscal'], summary: 'UC-FIS-002 — Listar NFs' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPodeLerNf(request.user.permissoes);
        const q = request.query as { pedidoId?: string; limit?: string };
        return ok(
          reply,
          await listarDocumentosFiscais({
            empresaId: BigInt(request.user.empresaId),
            pedidoId: q.pedidoId ? BigInt(q.pedidoId) : undefined,
            limit: q.limit ? Number(q.limit) : undefined,
          }),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/documentos-fiscais/:id', {
    schema: { tags: ['Fiscal'], summary: 'Obter NF' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPodeLerNf(request.user.permissoes);
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await obterDocumentoFiscal(BigInt(request.user.empresaId), BigInt(id)),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/documentos-fiscais/emitir', {
    schema: {
      tags: ['Fiscal'],
      summary: 'UC-FIS-001/005 — Emitir NF via Focus (sem criar TIT)',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fis.nf.emitir');
        const body = z
          .object({
            pedidoId: z.string(),
            pedidoItemIds: z.array(z.string()).optional(),
            idempotencyKey: z.string().nullable().optional(),
            naturezaOperacao: z.string().nullable().optional(),
          })
          .parse(request.body);
        const data = await emitirDocumentoFiscal({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          pedidoId: BigInt(body.pedidoId),
          pedidoItemIds: body.pedidoItemIds,
          idempotencyKey: body.idempotencyKey,
          naturezaOperacao: body.naturezaOperacao,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, data.replay ? 200 : 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/documentos-fiscais/:id/artefatos', {
    schema: { tags: ['Fiscal'], summary: 'Artefatos NF (xml/pdf + manifesto stub)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPodeLerNf(request.user.permissoes);
        const { id } = request.params as { id: string };
        return ok(
          reply,
          await obterArtefatosDocumentoFiscal(BigInt(request.user.empresaId), BigInt(id)),
        );
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/documentos-fiscais/:id/cancelar', {
    schema: { tags: ['Fiscal'], summary: 'Cancelar NF autorizada' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fis.nf.cancelar');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            justificativa: z.string().min(15),
            idempotencyKey: z.string(),
          })
          .parse(request.body);
        const data = await cancelarDocumentoFiscal({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          documentoId: BigInt(id),
          justificativa: body.justificativa,
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

  app.post('/api/v1/documentos-fiscais/:id/cce', {
    schema: { tags: ['Fiscal'], summary: 'Emitir carta de correção (CC-e)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'fis.nf.cancelar');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            correcao: z.string().min(15),
            idempotencyKey: z.string(),
          })
          .parse(request.body);
        const data = await emitirCceDocumentoFiscal({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          documentoId: BigInt(id),
          correcao: body.correcao,
          idempotencyKey: body.idempotencyKey,
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
