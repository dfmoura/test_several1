import type { FastifyRequest, FastifyReply } from 'fastify';

const PUBLIC_PATHS = ['/health/live', '/health/ready', '/health/gov'];

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (PUBLIC_PATHS.some((p) => request.url.startsWith(p))) return;

  const apiKey = request.headers['x-api-key'];
  const auth = request.headers.authorization;
  const config = request.server.config;

  if (apiKey === config.apiKey) return;

  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    if (token === config.apiKey) return;
  }

  return reply.status(401).send({
    type: 'https://nfse.local/errors/UNAUTHORIZED',
    title: 'Unauthorized',
    status: 401,
    detail: 'API Key ou Bearer token inválido',
  });
}
