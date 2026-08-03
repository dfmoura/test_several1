import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/prisma/client.js';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import { processarWebhookBank } from '../financeiro/financeiro.service.js';
import { AppError } from '../shared/errors/app-error.js';

export async function registerIntegracoesRoutes(app: FastifyInstance) {
  app.post('/api/v1/integracoes/focus/webhook', {
    schema: { tags: ['Integrações'], summary: 'Webhook Focus — idempotente, atualiza NF por chave' },
    handler: async (request, reply) => {
      try {
        const body = z
          .object({
            idempotencyKey: z.string().optional(),
            chave: z.string().optional(),
            chave_nfe: z.string().optional(),
            status: z.string().optional(),
            protocolo: z.string().optional(),
          })
          .passthrough()
          .parse(request.body ?? {});

        const idem =
          body.idempotencyKey?.trim() ||
          `focus-wh-${String(body.chave ?? body.chave_nfe ?? Date.now())}`;

        const exist = await prisma.webhookEvent.findUnique({
          where: { idempotencyKey: idem },
        });
        if (exist) {
          return ok(reply, { replay: true, id: exist.id.toString() });
        }

        const evt = await prisma.webhookEvent.create({
          data: {
            provider: 'focus',
            idempotencyKey: idem,
            payload: body as object,
            processadoEm: new Date(),
          },
        });

        const chave44 = String(body.chave ?? body.chave_nfe ?? '').replace(/\D/g, '');
        if (chave44.length === 44) {
          const status = String(body.status ?? '').toLowerCase();
          const data: Record<string, unknown> = { payloadRetorno: body };
          if (status.includes('cancel')) {
            data.status = 'CANCELADA';
            data.canceladoEm = new Date();
            data.protocoloCancelamento = body.protocolo ?? null;
          } else if (status.includes('autoriz') || status === 'autorizado') {
            data.status = 'AUTORIZADA';
            data.autorizadoEm = new Date();
            if (body.protocolo) data.protocolo = body.protocolo;
          }
          await prisma.documentoFiscal.updateMany({
            where: { chave44 },
            data: data as never,
          });
        }

        return ok(reply, { replay: false, id: evt.id.toString() }, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/integracoes/bank/webhook', {
    schema: {
      tags: ['Integrações'],
      summary: 'Webhook banco — match TIT ou BaixaAmbigua (idempotente)',
    },
    handler: async (request, reply) => {
      try {
        const body = z
          .object({
            empresaId: z.string().optional(),
            empresaCodigo: z.string().optional(),
            nossoNumero: z.string().optional(),
            valor: z.string().optional(),
            idempotencyKey: z.string(),
          })
          .passthrough()
          .parse(request.body ?? {});

        let empresaId: bigint | null = null;
        if (body.empresaId) {
          empresaId = BigInt(body.empresaId);
        } else {
          const emp = await prisma.empresa.findFirst({
            where: { codigo: body.empresaCodigo?.trim() || 'EMP-00001' },
          });
          if (!emp) {
            throw new AppError('EMPRESA_NAO_ENCONTRADA', 'Empresa não encontrada', 404);
          }
          empresaId = emp.id;
        }

        const data = await processarWebhookBank({
          empresaId,
          payload: body,
          idempotencyKey: body.idempotencyKey,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, data.replay ? 200 : 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
