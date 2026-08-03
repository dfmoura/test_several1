import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import { gerarExportContador } from './export-contador.service.js';

export async function registerGerencialRoutes(app: FastifyInstance) {
  app.get('/api/v1/gerencial/export-contador', {
    schema: {
      tags: ['Gerencial'],
      summary: 'UC-GER-004 — Pacote mensal export contador (ZIP CSV)',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'ger.export.baixar');
        const q = z
          .object({
            ano: z.coerce.number().int(),
            mes: z.coerce.number().int().min(1).max(12),
            meta: z.enum(['0', '1']).optional(),
          })
          .parse(request.query);

        const pack = await gerarExportContador({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ano: q.ano,
          mes: q.mes,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });

        if (q.meta === '1') {
          return ok(reply, pack.meta);
        }

        return reply
          .status(200)
          .header('Content-Type', pack.contentType)
          .header(
            'Content-Disposition',
            `attachment; filename="${pack.filename}"`,
          )
          .send(pack.buffer);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
