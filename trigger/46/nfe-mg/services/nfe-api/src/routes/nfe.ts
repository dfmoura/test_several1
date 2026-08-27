import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '@nfe/shared';
import { buscarCfop, CRT_OPTIONS, CSOSN_OPTIONS, CST_OPTIONS, ORIGEM_MERCADORIA, IND_IE_DEST_OPTIONS, CST_PIS_COFINS_OPTIONS, CST_IBS_CBS_OPTIONS, CCLASS_TRIB_OPTIONS, CST_IS_OPTIONS, TIPO_ITEM_SPED_OPTIONS, FINALIDADE_PARCEIRO_OPTIONS, REGIME_PARCEIRO_OPTIONS, IE_STATUS_OPTIONS, TIPO_FORNECIMENTO_OPTIONS } from '@nfe/domain';


const EnderecoSchema = z.object({
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  bairro: z.string().min(1),
  codigoMunicipio: z.string().length(7),
  municipio: z.string().min(1),
  uf: z.string().length(2),
  cep: z.string().min(8),
});

const DestinatarioSchema = z.object({
  tipo: z.enum(['PF', 'PJ']),
  cpfCnpj: z.string().min(11),
  razaoSocial: z.string().min(1),
  inscricaoEstadual: z.string().optional(),
  indIEDest: z.enum(['1', '2', '9']).default('9'),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: EnderecoSchema,
});

const ItemSchema = z.object({
  produtoId: z.string().uuid().optional(),
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  ncm: z.string().min(8),
  cfop: z.string().length(4),
  unidade: z.string().min(1).default('UN'),
  quantidade: z.number().positive(),
  valorUnitario: z.number().min(0),
  origem: z.string().length(1).optional(),
  csosn: z.string().optional(),
  cst: z.string().optional(),
  cest: z.string().optional(),
});

const EmitirSchema = z.object({
  naturezaOperacao: z.string().min(1),
  serie: z.number().int().positive().optional(),
  destinatario: DestinatarioSchema,
  itens: z.array(ItemSchema).min(1),
  informacoesAdicionais: z.string().optional(),
  indFinal: z.enum(['0', '1']).optional(),
  indPres: z.enum(['0', '1', '2', '3', '4', '5', '9']).optional(),
  modFrete: z.enum(['0', '1', '2', '9']).optional(),
  correlationId: z.string().optional(),
});

function emitenteIdFrom(request: { headers: Record<string, unknown>; query: unknown }): string {
  const header = request.headers['x-emitente-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  const q = request.query as { emitenteId?: string };
  if (q?.emitenteId) return q.emitenteId;
  throw new ValidationError('Informe X-Emitente-Id');
}

export async function registerNfeRoutes(app: FastifyInstance) {
  app.get('/v1/catalogos', async () => ({
    cfop: buscarCfop(''),
    crt: CRT_OPTIONS,
    csosn: CSOSN_OPTIONS,
    cst: CST_OPTIONS,
    origem: ORIGEM_MERCADORIA,
    indIEDest: IND_IE_DEST_OPTIONS,
    cstPisCofins: CST_PIS_COFINS_OPTIONS,
    cstIbsCbs: CST_IBS_CBS_OPTIONS,
    cclassTrib: CCLASS_TRIB_OPTIONS,
    cstIs: CST_IS_OPTIONS,
    tipoItemSped: TIPO_ITEM_SPED_OPTIONS,
    finalidadeParceiro: FINALIDADE_PARCEIRO_OPTIONS,
    regimeParceiro: REGIME_PARCEIRO_OPTIONS,
    ieStatus: IE_STATUS_OPTIONS,
    tipoFornecimento: TIPO_FORNECIMENTO_OPTIONS,
  }));

  app.get('/v1/catalogos/cfop', async (request) => {
    const q = (request.query as { q?: string }).q ?? '';
    return buscarCfop(q);
  });

  app.post('/v1/nfe', async (request) => {
    const parsed = EmitirSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Payload inválido', parsed.error.flatten());
    const emitenteId = emitenteIdFrom(request);
    const idem = request.headers['x-idempotency-key'] as string | undefined;
    return app.nfeService.emitir(emitenteId, parsed.data, idem, request.ip);
  });

  app.get('/v1/nfe', async (request) => {
    const emitenteId = emitenteIdFrom(request);
    const q = request.query as Record<string, string | undefined>;
    return app.nfeService.listar(emitenteId, {
      situacao: q.situacao,
      chave: q.chave,
      de: q.de,
      ate: q.ate,
      limit: q.limit ? Number(q.limit) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
    });
  });

  app.get('/v1/nfe/:chave', async (request) => {
    const { chave } = request.params as { chave: string };
    return app.nfeService.consultar(chave);
  });

  app.get('/v1/nfe/:chave/xml', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const xml = await app.nfeService.getXml(chave);
    reply.header('Content-Type', 'application/xml; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${chave}.xml"`);
    return xml;
  });

  app.get('/v1/nfe/:chave/danfe', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const url = app.config.danfeUrl ?? 'http://nfe-danfe:3001';
    const res = await fetch(`${url}/danfe/${chave}`);
    if (!res.ok) {
      throw new ValidationError('Falha ao gerar DANFE');
    }
    const buf = Buffer.from(await res.arrayBuffer());
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename="DANFE-${chave}.pdf"`);
    return reply.send(buf);
  });

  app.post('/v1/nfe/:chave/cancelar', async (request) => {
    const { chave } = request.params as { chave: string };
    const body = z.object({ motivo: z.string().min(15) }).parse(request.body);
    return app.nfeService.cancelar(chave, { chaveAcesso: chave, motivo: body.motivo }, request.ip);
  });

  app.post('/v1/nfe/:chave/cce', async (request) => {
    const { chave } = request.params as { chave: string };
    const body = z.object({ correcao: z.string().min(15) }).parse(request.body);
    return app.nfeService.cartaCorrecao(chave, { chaveAcesso: chave, correcao: body.correcao }, request.ip);
  });

  app.post('/v1/inutilizacoes', async (request) => {
    const emitenteId = emitenteIdFrom(request);
    const body = z.object({
      serie: z.number().int().positive(),
      numeroIni: z.number().int().positive(),
      numeroFim: z.number().int().positive(),
      ano: z.number().int(),
      motivo: z.string().min(15),
    }).parse(request.body);
    return app.nfeService.inutilizar(emitenteId, body, request.ip);
  });

  app.get('/v1/inutilizacoes', async (request) => {
    const emitenteId = emitenteIdFrom(request);
    const q = request.query as { limit?: string; offset?: string };
    return app.adminService.inutilizacoes(emitenteId, Number(q.limit ?? 50), Number(q.offset ?? 0));
  });
}
