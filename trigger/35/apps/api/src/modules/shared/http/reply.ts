import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { serializeBigInt } from '../../../infrastructure/prisma/client.js';

export function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  const message = err instanceof Error ? err.message : 'Erro interno';
  reply.log.error({ err }, 'unhandled');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Erro interno' : message,
    },
  });
}

export function ok<T>(reply: FastifyReply, data: T, status = 200) {
  return reply.status(status).send(serializeBigInt({ data }));
}

export function getCorrelationId(request: FastifyRequest): string {
  const header = request.headers['x-correlation-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  return request.id;
}
