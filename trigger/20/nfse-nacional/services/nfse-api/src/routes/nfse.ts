import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '@nfse/shared';
import { SyncService, createCertificadoProvider, XmlStorage, createDb, resolveEmitente } from '@nfse/application';
import { createAdnGateway } from '@nfse/gov-client';
import {
  buscarTributacaoNacional,
  buscarTributacaoPorCodigo,
  formatCodigoTribNac,
  buscarNbs,
  buscarNbsPorCodigo,
  formatCodigoNbs,
  type TributacaoNacionalItem,
  type NbsItem,
} from '@nfse/domain';

const EnderecoSchema = z.object({
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  complemento: z.string().optional(),
  bairro: z.string().min(1),
  codigoMunicipio: z.string().length(7),
  uf: z.string().length(2),
  cep: z.string().min(8),
  nomeMunicipio: z.string().optional(),
});

const TomadorSchema = z.object({
  tipo: z.enum(['PF', 'PJ']),
  cpfCnpj: z.string().min(11),
  razaoSocial: z.string().optional(),
  nome: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  email: z.string().email().optional(),
  telefone: z.string().optional(),
  endereco: EnderecoSchema.optional(),
});

const ServicoSchema = z.object({
  codigoServico: z.string().min(1),
  codigoNbs: z.string().optional(),
  descricao: z.string().min(1),
  codigoMunicipioIncidencia: z.string().length(7),
  codigoTributacaoMunicipal: z.string().optional(),
  codigoPaisPrestacao: z.string().optional(),
  codigoPaisResultado: z.string().optional(),
  aliquotaIss: z.number().optional(),
  tributacaoIssqn: z.enum(['1', '2', '3', '4']).optional(),
  tipoImunidade: z.enum(['0', '1', '2', '3', '4', '5']).optional(),
  suspensaoExigibilidade: z.enum(['1', '2']).optional(),
  numeroProcessoSuspensao: z.string().optional(),
  beneficioMunicipal: z.string().optional(),
  retencaoIssqn: z.enum(['1', '2', '3']).optional(),
  tpRetPisCofins: z.enum(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']).optional(),
});

const TotTribSchema = z.object({
  modo: z.enum(['valores', 'percentuais', 'aliquota_sn']),
  valorFederal: z.number().min(0).optional(),
  valorEstadual: z.number().min(0).optional(),
  valorMunicipal: z.number().min(0).optional(),
  percentualFederal: z.number().min(0).optional(),
  percentualEstadual: z.number().min(0).optional(),
  percentualMunicipal: z.number().min(0).optional(),
  aliquotaSimplesNacional: z.number().min(0).optional(),
});

const ValoresSchema = z.object({
  valorServico: z.number().positive(),
  valorRecebidoIntermediario: z.number().min(0).optional(),
  descontoIncondicionado: z.number().min(0).optional(),
  descontoCondicionado: z.number().min(0).optional(),
  valorDeducoes: z.number().optional(),
  valorPis: z.number().optional(),
  valorCofins: z.number().optional(),
  valorInss: z.number().optional(),
  valorIr: z.number().optional(),
  valorCsll: z.number().optional(),
  valorIss: z.number().optional(),
  valorLiquido: z.number().optional(),
});

const EmitirSchema = z.object({
  tomador: TomadorSchema,
  servico: ServicoSchema,
  opSimpNac: z.enum(['1', '2', '3']).optional(),
  regApTribSN: z.enum(['1', '2', '3']).optional(),
  regimeEspecialTributacao: z.enum(['0', '1', '2', '3', '4', '5', '6']).optional(),
  totTrib: TotTribSchema.optional(),
  valores: ValoresSchema,
  discriminacao: z.string().optional(),
  dataCompetencia: z.string().optional(),
  correlationId: z.string().optional(),
});

const CancelarSchema = z.object({
  codigoMotivo: z.string().min(1),
  motivo: z.string().min(15),
});

export async function registerNfseRoutes(app: FastifyInstance) {
  app.post('/v1/nfse', async (request, reply) => {
    const parsed = EmitirSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Payload inválido', parsed.error.flatten());
    }

    const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;
    const result = await app.nfseService.emitir(
      parsed.data,
      idempotencyKey,
      request.ip,
    );
    return reply.status(201).send(result);
  });

  app.post('/v1/nfse/:chave/cancelar', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const parsed = CancelarSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Payload inválido', parsed.error.flatten());
    }

    const result = await app.nfseService.cancelar(
      { chaveAcesso: chave, ...parsed.data },
      request.ip,
    );
    return reply.send(result);
  });

  app.post('/v1/nfse/:chave/substituir', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const parsed = EmitirSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Payload inválido', parsed.error.flatten());
    }

    const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;
    const result = await app.nfseService.substituir(
      { ...parsed.data, chaveSubstituida: chave },
      idempotencyKey,
      request.ip,
    );
    return reply.status(201).send(result);
  });

  /** NFS-e recebidas via ADN — outros prestadores, CNPJ do certificado como tomador. */
  app.get('/v1/nfse/recebidas', async (request) => {
    const query = request.query as {
      chave?: string;
      de?: string;
      ate?: string;
      limit?: string;
      offset?: string;
    };
    return app.dfeRecebidasService.listar({
      chave: query.chave,
      de: query.de,
      ate: query.ate,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
  });

  app.get('/v1/nfse/recebidas/:chave', async (request) => {
    const { chave } = request.params as { chave: string };
    return app.dfeRecebidasService.consultar(chave);
  });

  app.get('/v1/nfse/recebidas/:chave/xml', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const xml = await app.dfeRecebidasService.getXml(chave);
    return reply.type('application/xml').send(xml);
  });

  app.get('/v1/nfse/:chave', async (request) => {
    const { chave } = request.params as { chave: string };
    const refresh = (request.query as { refresh?: string }).refresh === 'true';
    return app.nfseService.consultar(chave, refresh);
  });

  app.get('/v1/nfse', async (request) => {
    const query = request.query as {
      situacao?: string;
      chave?: string;
      de?: string;
      ate?: string;
      limit?: string;
      offset?: string;
    };
    return app.nfseService.listar({
      situacao: query.situacao,
      chave: query.chave,
      de: query.de,
      ate: query.ate,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
  });

  app.get('/v1/nfse/:chave/eventos', async (request) => {
    const { chave } = request.params as { chave: string };
    return app.nfseService.listarEventos(chave);
  });

  app.get('/v1/nfse/:chave/xml', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const xml = await app.nfseService.getXml(chave);
    return reply.type('application/xml').send(xml);
  });

  app.get('/v1/nfse/:chave/danfse', async (request, reply) => {
    const { chave } = request.params as { chave: string };
    const danfseUrl = process.env.NFSE_DANFSE_URL ?? 'http://nfse-danfse:3001';
    const response = await fetch(`${danfseUrl}/generate/${chave}`);
    if (!response.ok) {
      return reply.status(502).send({ detail: 'Serviço DANFSe indisponível' });
    }
    const pdf = Buffer.from(await response.arrayBuffer());
    return reply.type('application/pdf').send(pdf);
  });

  app.get('/v1/dps/:id', async (request) => {
    const { id } = request.params as { id: string };
    return app.nfseService.consultarDps(id);
  });

  app.post('/v1/sync/dfe', async (_request, reply) => {
    const config = app.config;
    const db = createDb(config.databaseUrl);
    const certificado = createCertificadoProvider(config);
    const emitente = resolveEmitente(config, certificado.validade());
    const adn = createAdnGateway(
      config.ambiente,
      config.govMock,
      certificado.getHttpsAgent(),
      emitente.cnpj,
    );
    const storage = new XmlStorage(config);
    const sync = new SyncService(db, adn, storage, config);
    const result = await sync.sincronizarDfe();
    return reply.send(result);
  });

  app.get('/v1/parametros/municipio/:ibge', async (request) => {
    const { ibge } = request.params as { ibge: string };
    return {
      codigoIbge: ibge,
      convenioAtivo: true,
      aliquotas: { default: 5.0 },
      cachedAt: new Date().toISOString(),
      message: 'Cache parametrização — integrar ParametrosMunicipais gateway em homolog',
    };
  });

  /** Cartão CNPJ (Receita) — não retorna inscrição municipal (cadastro manual). */
  app.get('/v1/cadastro/cnpj/:cnpj', async (request, reply) => {
    const { cnpj } = request.params as { cnpj: string };
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      throw new ValidationError('CNPJ deve ter 14 dígitos');
    }

    const dados = await app.enrichment.consultarCnpj(digits);
    if (!dados) {
      return reply.status(404).send({ detail: 'CNPJ não encontrado na base da Receita Federal' });
    }

    const nomeMunicipio = await app.enrichment.nomeMunicipio(dados.endereco.codigoMunicipio);

    return {
      cnpj: dados.cnpj,
      razaoSocial: dados.razaoSocial,
      nomeFantasia: dados.nomeFantasia,
      situacaoCadastral: dados.situacaoCadastral,
      email: dados.email,
      telefone: dados.telefone,
      endereco: {
        ...dados.endereco,
        nomeMunicipio: nomeMunicipio ?? dados.endereco.nomeMunicipio ?? undefined,
      },
      porte: dados.porte,
      naturezaJuridica: dados.naturezaJuridica,
      dataAbertura: dados.dataAbertura,
      tipoEstabelecimento: dados.tipoEstabelecimento,
      optanteSimples: dados.optanteSimples,
      atividadePrincipal: dados.atividadePrincipal,
      fonte: formatFonteCadastro(dados.fontes),
    };
  });

  /** Base nacional LC 116 — busca por código ou descrição (cTribNac). */
  app.get('/v1/cadastro/tributacao-nacional', async (request) => {
    const query = request.query as { q?: string; limit?: string };
    const q = query.q?.trim() ?? '';
    const limit = Math.min(Math.max(parseInt(query.limit ?? '20', 10) || 20, 1), 50);

    if (!q) {
      return { total: 0, items: [] };
    }

    const items = buscarTributacaoNacional(q, limit).map((item: TributacaoNacionalItem) => ({
      ...item,
      codigoFormatado: formatCodigoTribNac(item.codigo),
    }));

    return { total: items.length, items };
  });

  /** Base nacional LC 116 — consulta por código exato (6 dígitos). */
  app.get('/v1/cadastro/tributacao-nacional/:codigo', async (request, reply) => {
    const { codigo } = request.params as { codigo: string };
    const item = buscarTributacaoPorCodigo(codigo);

    if (!item) {
      return reply.status(404).send({ detail: 'Código de tributação nacional não encontrado na base LC 116' });
    }

    return {
      ...item,
      codigoFormatado: formatCodigoTribNac(item.codigo),
    };
  });

  /** Base oficial NBS (ANEXO_B) — busca por código ou descrição. */
  app.get('/v1/cadastro/nbs', async (request) => {
    const query = request.query as { q?: string; limit?: string; codigoTribNac?: string };
    const q = query.q?.trim() ?? '';
    const limit = Math.min(Math.max(parseInt(query.limit ?? '20', 10) || 20, 1), 50);
    const codigoTribNac = query.codigoTribNac?.replace(/\D/g, '') ?? undefined;

    const items = buscarNbs(q, limit, codigoTribNac?.length === 6 ? codigoTribNac : undefined).map(
      (item: NbsItem) => ({
        ...item,
        codigoFormatado: formatCodigoNbs(item.codigo),
      }),
    );

    return { total: items.length, items };
  });

  /** Base oficial NBS — consulta por código exato (9 dígitos). */
  app.get('/v1/cadastro/nbs/:codigo', async (request, reply) => {
    const { codigo } = request.params as { codigo: string };
    const item = buscarNbsPorCodigo(codigo);

    if (!item) {
      return reply.status(404).send({ detail: 'Código NBS não encontrado na base oficial (ANEXO_B)' });
    }

    return {
      ...item,
      codigoFormatado: formatCodigoNbs(item.codigo),
    };
  });
}

function formatFonteCadastro(fontes?: string[]): string {
  if (!fontes?.length) return 'receita-federal';
  const labels: Record<string, string> = {
    brasilapi: 'Brasil API',
    receitaws: 'Receita WS',
  };
  return fontes.map((f) => labels[f] ?? f).join(' + ');
}
