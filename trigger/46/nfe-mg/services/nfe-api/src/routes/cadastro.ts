import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '@nfe/shared';
import type { Crt, Endereco, FinalidadeParceiro, IeStatus, RegimeParceiro, TipoFornecimento } from '@nfe/domain';

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

const ParceiroBodySchema = z.object({
  apelido: z.string().min(1),
  tipo: z.enum(['PF', 'PJ', 'EX']),
  cpfCnpj: z.string().min(0).optional().default(''),
  razaoSocial: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  indIEDest: z.enum(['1', '2', '9']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  endereco: EnderecoSchema.optional(),
  ativo: z.boolean().optional(),
  papelCliente: z.boolean().optional(),
  papelFornecedor: z.boolean().optional(),
  papelTransportadora: z.boolean().optional(),
  inscricaoMunicipal: z.string().optional(),
  emailXml: z.string().email().optional().or(z.literal('')),
  finalidade: z.enum(['REVENDA', 'INDUSTRIALIZACAO', 'USO_CONSUMO']).optional(),
  consumidorFinal: z.boolean().optional(),
  regime: z.enum(['SIMPLES_NACIONAL', 'MEI', 'PRESUMIDO', 'REAL', 'ISENTO', 'OUTRO']).optional(),
  ieStatus: z.enum(['NAO_VERIFICADA', 'OK', 'BAIXADA', 'NAO_HABILITADA', 'ISENTA']).optional(),
  suframa: z.string().optional(),
  areaIncentivada: z.boolean().optional(),
  cnae: z.string().optional(),
  tipoFornecimento: z.enum(['MERCADORIA', 'SERVICO', 'UTILIDADE', 'TRIBUTO']).optional(),
  cfopEntradaPadrao: z.string().length(4).optional(),
  emiteDocumentoFiscal: z.boolean().optional(),
  idEstrangeiro: z.string().optional(),
});

const ProdutoBodySchema = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  descricaoFiscal: z.string().optional(),
  ncm: z.string().min(8),
  cfop: z.string().length(4),
  cfopEntradaPadrao: z.string().length(4).optional(),
  unidade: z.string().optional(),
  valorUnitario: z.number().optional(),
  origem: z.string().optional(),
  csosn: z.string().optional(),
  cst: z.string().optional(),
  cest: z.string().optional(),
  gtin: z.string().optional(),
  tipoItemSped: z.string().length(2).optional(),
  cstPis: z.string().optional(),
  cstCofins: z.string().optional(),
  aliquotaPis: z.number().optional(),
  aliquotaCofins: z.number().optional(),
  cstIbsCbs: z.string().optional(),
  cstCbs: z.string().optional(),
  cclassTrib: z.string().optional(),
  aliquotaIbs: z.number().optional(),
  aliquotaCbs: z.number().optional(),
  cstIs: z.string().optional(),
  cclassTribIs: z.string().optional(),
  aliquotaIs: z.number().optional(),
  sujeitoIs: z.boolean().optional(),
  cbenef: z.string().optional(),
  ativo: z.boolean().optional(),
});

function emitenteIdFrom(request: { headers: Record<string, unknown>; query: unknown; params?: unknown }): string {
  const params = request.params as { id?: string } | undefined;
  if (params?.id) return params.id;
  const header = request.headers['x-emitente-id'];
  if (typeof header === 'string' && header.length > 0) return header;
  const q = request.query as { emitenteId?: string };
  if (q?.emitenteId) return q.emitenteId;
  throw new ValidationError('Informe X-Emitente-Id');
}

function normalizeParceiroBody(body: z.infer<typeof ParceiroBodySchema>) {
  return {
    ...body,
    email: body.email || undefined,
    emailXml: body.emailXml || undefined,
    finalidade: body.finalidade as FinalidadeParceiro | undefined,
    regime: body.regime as RegimeParceiro | undefined,
    ieStatus: body.ieStatus as IeStatus | undefined,
    tipoFornecimento: body.tipoFornecimento as TipoFornecimento | undefined,
    cpfCnpj: body.cpfCnpj || body.idEstrangeiro || '',
  };
}

export async function registerCadastroRoutes(app: FastifyInstance) {
  app.get('/v1/emitentes', async () => app.emitenteService.listar());

  app.post('/v1/emitentes', async (request) => {
    const body = z.object({
      apelido: z.string().min(1),
      cnpj: z.string().min(14),
      inscricaoEstadual: z.string().min(1),
      razaoSocial: z.string().min(1),
      nomeFantasia: z.string().optional(),
      crt: z.enum(['1', '2', '3']),
      cnae: z.string().optional(),
      endereco: EnderecoSchema,
      telefone: z.string().optional(),
      email: z.string().email().optional(),
      ambiente: z.enum(['homolog', 'prod']).optional(),
      seriePadrao: z.number().int().positive().optional(),
      credenciadoSiare: z.boolean().optional(),
    }).parse(request.body);
    return app.emitenteService.criar({ ...body, crt: body.crt as Crt, endereco: body.endereco as Endereco }, request.ip);
  });

  app.get('/v1/emitentes/:id', async (request) => {
    const { id } = request.params as { id: string };
    return app.emitenteService.obter(id);
  });

  app.patch('/v1/emitentes/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      apelido: z.string().optional(),
      inscricaoEstadual: z.string().optional(),
      razaoSocial: z.string().optional(),
      nomeFantasia: z.string().optional(),
      crt: z.enum(['1', '2', '3']).optional(),
      cnae: z.string().optional(),
      endereco: EnderecoSchema.optional(),
      telefone: z.string().optional(),
      email: z.string().email().optional(),
      ambiente: z.enum(['homolog', 'prod']).optional(),
      seriePadrao: z.number().int().positive().optional(),
      credenciadoSiare: z.boolean().optional(),
    }).parse(request.body);
    return app.emitenteService.atualizar(id, body, request.ip);
  });

  app.post('/v1/emitentes/:id/certificado', async (request) => {
    const { id } = request.params as { id: string };
    const file = await request.file();
    if (!file) throw new ValidationError('Envie o arquivo PFX no campo "pfx"');
    const password = (file.fields.password as { value?: string } | undefined)?.value
      ?? (request.headers['x-cert-password'] as string | undefined);
    if (!password) throw new ValidationError('Informe a senha do certificado (campo password)');
    const buf = await file.toBuffer();
    return app.emitenteService.uploadCertificado(id, buf, password, request.ip);
  });

  app.post('/v1/emitentes/:id/status-servico', async (request) => {
    const { id } = request.params as { id: string };
    return app.emitenteService.statusServico(id);
  });

  const listParceiros = async (request: { headers: Record<string, unknown>; query: unknown }) =>
    app.destinatarioService.listar(emitenteIdFrom(request));

  const createParceiro = async (request: { headers: Record<string, unknown>; query: unknown; body: unknown; ip: string }) => {
    const emitenteId = emitenteIdFrom(request);
    const body = normalizeParceiroBody(ParceiroBodySchema.parse(request.body));
    return app.destinatarioService.criar(emitenteId, body, request.ip);
  };

  const patchParceiro = async (request: { headers: Record<string, unknown>; query: unknown; params: unknown; body: unknown; ip: string }) => {
    const emitenteId = emitenteIdFrom(request);
    const { id } = request.params as { id: string };
    const parsed = ParceiroBodySchema.partial().parse(request.body);
    const body = normalizeParceiroBody({
      apelido: parsed.apelido ?? 'x',
      tipo: parsed.tipo ?? 'PJ',
      cpfCnpj: parsed.cpfCnpj ?? '',
      ...parsed,
    });
    const { apelido: _a, tipo: _t, cpfCnpj: _c, ...rest } = body;
    const patch: Record<string, unknown> = { ...rest };
    if (parsed.apelido !== undefined) patch.apelido = parsed.apelido;
    if (parsed.tipo !== undefined) patch.tipo = parsed.tipo;
    if (parsed.cpfCnpj !== undefined) patch.cpfCnpj = parsed.cpfCnpj;
    return app.destinatarioService.atualizar(emitenteId, id, patch as never, request.ip);
  };

  const getParceiro = async (request: { headers: Record<string, unknown>; query: unknown; params: unknown }) => {
    const emitenteId = emitenteIdFrom(request);
    const { id } = request.params as { id: string };
    return app.destinatarioService.obter(emitenteId, id);
  };

  // Rotas canônicas (compat) + alias /parceiros
  app.get('/v1/destinatarios', listParceiros);
  app.get('/v1/parceiros', listParceiros);
  app.post('/v1/destinatarios', createParceiro);
  app.post('/v1/parceiros', createParceiro);
  app.get('/v1/destinatarios/:id', getParceiro);
  app.get('/v1/parceiros/:id', getParceiro);
  app.patch('/v1/destinatarios/:id', patchParceiro);
  app.patch('/v1/parceiros/:id', patchParceiro);

  app.get('/v1/produtos', async (request) => {
    return app.produtoService.listar(emitenteIdFrom(request));
  });

  app.get('/v1/produtos/:id', async (request) => {
    const emitenteId = emitenteIdFrom(request);
    const { id } = request.params as { id: string };
    return app.produtoService.obter(emitenteId, id);
  });

  app.post('/v1/produtos', async (request) => {
    const emitenteId = emitenteIdFrom(request);
    const body = ProdutoBodySchema.parse(request.body);
    return app.produtoService.criar(emitenteId, body, request.ip);
  });

  app.patch('/v1/produtos/:id', async (request) => {
    const emitenteId = emitenteIdFrom(request);
    const { id } = request.params as { id: string };
    const body = ProdutoBodySchema.partial().parse(request.body);
    return app.produtoService.atualizar(emitenteId, id, body, request.ip);
  });
}
