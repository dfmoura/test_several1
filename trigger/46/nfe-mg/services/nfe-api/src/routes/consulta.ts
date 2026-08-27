import type { FastifyInstance } from 'fastify';
import { ConsultaService } from '../consulta/consulta-service.js';

export async function registerConsultaRoutes(app: FastifyInstance) {
  const consulta = new ConsultaService();

  app.get('/v1/consulta/cnpj/:cnpj', async (request) => {
    const { cnpj } = request.params as { cnpj: string };
    return consulta.cnpj(cnpj);
  });

  app.get('/v1/consulta/cep/:cep', async (request) => {
    const { cep } = request.params as { cep: string };
    return consulta.cep(cep);
  });

  app.get('/v1/consulta/ncm', async (request) => {
    const q = (request.query as { q?: string; limit?: string }).q ?? '';
    const limit = Number((request.query as { limit?: string }).limit ?? 20);
    return consulta.ncm(q, Number.isFinite(limit) ? limit : 20);
  });

  app.get('/v1/consulta/cest', async (request) => {
    const { q = '', ncm, limit } = request.query as { q?: string; ncm?: string; limit?: string };
    return consulta.cest(q, ncm, Number(limit ?? 20) || 20);
  });

  app.get('/v1/consulta/cfop', async (request) => {
    const { q = '', tipo } = request.query as { q?: string; tipo?: 'entrada' | 'saida' };
    return consulta.cfop(q, tipo);
  });

  app.get('/v1/consulta/csosn', async (request) => {
    return consulta.csosn((request.query as { q?: string }).q ?? '');
  });

  app.get('/v1/consulta/cst-icms', async (request) => {
    return consulta.cstIcms((request.query as { q?: string }).q ?? '');
  });

  app.get('/v1/consulta/cst-pis-cofins', async (request) => {
    return consulta.cstPisCofins((request.query as { q?: string }).q ?? '');
  });

  app.get('/v1/consulta/cst-ibs-cbs', async (request) => {
    return consulta.cstIbsCbs((request.query as { q?: string }).q ?? '');
  });

  app.get('/v1/consulta/cclass-trib', async (request) => {
    return consulta.cclassTrib((request.query as { q?: string }).q ?? '');
  });

  app.get('/v1/consulta/cst-is', async (request) => {
    return consulta.cstIs((request.query as { q?: string }).q ?? '');
  });

  app.get('/v1/consulta/tipos-item-sped', async (request) => {
    return consulta.tipoItemSped((request.query as { q?: string }).q ?? '');
  });

  app.get('/v1/consulta/origens', async (request) => {
    return consulta.origem((request.query as { q?: string }).q ?? '');
  });
}
