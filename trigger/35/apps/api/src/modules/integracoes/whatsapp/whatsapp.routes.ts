import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../../plataforma/auth/auth.service.js';
import { enviarWhatsAppTemplate } from './whatsapp.service.js';

export async function registerWhatsAppRoutes(app: FastifyInstance) {
  app.post('/api/v1/integracoes/whatsapp/mensagens', {
    schema: {
      tags: ['Integrações'],
      summary: 'UC-INT-003 — Enviar template WhatsApp (stub Meta)',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'int.wa.enviar');
        const body = z
          .object({
            toE164: z.string().min(8),
            templateName: z.string().min(1),
            templateParams: z.array(z.string()).optional(),
            agregadoTipo: z.string().nullable().optional(),
            agregadoId: z.string().nullable().optional(),
            idempotencyKey: z.string().nullable().optional(),
          })
          .parse(request.body ?? {});
        const data = await enviarWhatsAppTemplate({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          toE164: body.toE164,
          templateName: body.templateName,
          templateParams: body.templateParams,
          agregadoTipo: body.agregadoTipo,
          agregadoId: body.agregadoId,
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
}
