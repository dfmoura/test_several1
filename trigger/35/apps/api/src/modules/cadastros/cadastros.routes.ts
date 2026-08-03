import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCorrelationId, ok, sendError } from '../shared/http/reply.js';
import {
  assertPermissao,
  assertSessaoAtiva,
} from '../plataforma/auth/auth.service.js';
import {
  atualizarParceiro,
  criarParceiro,
  inativarParceiro,
  listarParceiros,
  obterParceiro,
  upsertDadoBancario,
} from './parceiro/parceiro.service.js';
import {
  adicionarFator,
  atualizarProduto,
  criarProduto,
  listarProdutos,
  obterProduto,
} from './produto/produto.service.js';
import {
  consultarCobrancaFaca,
  criarFaca,
  criarUnidade,
  listarFacas,
  listarUnidades,
} from './unidade/unidade-faca.service.js';

const enderecoSchema = z.object({
  tipo: z.enum(['FISCAL', 'ENTREGA', 'COBRANCA']).optional(),
  logradouro: z.string().min(2),
  numero: z.string().min(1),
  complemento: z.string().nullable().optional(),
  bairro: z.string().min(1),
  municipio: z.string().min(1),
  codigoIbge: z.string().nullable().optional(),
  uf: z.string().length(2),
  cep: z.string().min(8),
});

const parceiroBody = z.object({
  tipoPessoa: z.enum(['PJ', 'PF', 'ESTRANGEIRO']).optional(),
  cnpjCpf: z.string().nullable().optional(),
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().nullable().optional(),
  inscricaoEstadual: z.string().nullable().optional(),
  inscricaoMunicipal: z.string().nullable().optional(),
  indIEDest: z.enum(['CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE']).nullable().optional(),
  ehProspect: z.boolean().optional(),
  papelCliente: z.boolean().optional(),
  papelFornecedor: z.boolean().optional(),
  papelTransportadora: z.boolean().optional(),
  papelColaborador: z.boolean().optional(),
  papelBanco: z.boolean().optional(),
  papelContador: z.boolean().optional(),
  condicaoPagamentoPadrao: z.string().nullable().optional(),
  formaPagamentoPreferida: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  endereco: enderecoSchema.nullable().optional(),
  contato: z
    .object({
      nome: z.string().min(2),
      funcao: z.string().nullable().optional(),
      telefone: z.string().nullable().optional(),
      whatsapp: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      emailXml: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const produtoBody = z.object({
  familia: z.enum(['MP', 'EMB', 'REV', 'PA', 'SVC']),
  codigo: z.string().optional(),
  descricao: z.string().min(2),
  ncm: z.string().nullable().optional(),
  cest: z.string().nullable().optional(),
  origem: z.string().optional(),
  unidadeEstoqueCodigo: z.string().min(1),
  unidadeComercialCodigo: z.string().min(1),
  controlaEstoque: z.boolean().optional(),
  mascaraJson: z.record(z.unknown()).nullable().optional(),
  csosnPadrao: z.string().nullable().optional(),
  cfopPadraoDentro: z.string().nullable().optional(),
  cfopPadraoFora: z.string().nullable().optional(),
  precoTabela: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  fator: z
    .object({
      unidadeDeCodigo: z.string(),
      unidadeParaCodigo: z.string(),
      fator: z.string(),
    })
    .nullable()
    .optional(),
});

export async function registerCadastrosRoutes(app: FastifyInstance) {
  // ----- Parceiros -----
  app.get('/api/v1/parceiros', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-001 — Listar parceiros' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.parceiro.ler');
        const q = request.query as {
          q?: string;
          situacao?: string;
          papel?: string;
          limit?: string;
        };
        const data = await listarParceiros({
          empresaId: BigInt(request.user.empresaId),
          q: q.q,
          situacao: q.situacao,
          papel: q.papel,
          limit: q.limit ? Number(q.limit) : undefined,
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/parceiros/:id', {
    schema: { tags: ['Cadastros'], summary: 'Obter parceiro' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.parceiro.ler');
        const { id } = request.params as { id: string };
        const data = await obterParceiro(BigInt(request.user.empresaId), BigInt(id));
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/parceiros', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-001 — Criar parceiro' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.parceiro.escrever');
        const body = parceiroBody.parse(request.body);
        const data = await criarParceiro({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          input: body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.patch('/api/v1/parceiros/:id', {
    schema: { tags: ['Cadastros'], summary: 'Atualizar parceiro / completar fiscal' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.parceiro.escrever');
        const { id } = request.params as { id: string };
        const body = parceiroBody.partial().extend({
          situacao: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']).optional(),
        }).parse(request.body);
        const data = await atualizarParceiro({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          id: BigInt(id),
          input: body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/parceiros/:id/inativar', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-008 — Inativar parceiro' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.parceiro.escrever');
        const { id } = request.params as { id: string };
        const data = await inativarParceiro({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          id: BigInt(id),
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/parceiros/:id/dados-bancarios', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-007 — Dados bancários (FINANCEIRO)' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.bancario.escrever');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            bancoCodigo: z.string().min(1),
            bancoNome: z.string().nullable().optional(),
            agencia: z.string().min(1),
            conta: z.string().min(1),
            tipoConta: z.string().optional(),
            pixChave: z.string().nullable().optional(),
            pixTipo: z.string().nullable().optional(),
          })
          .parse(request.body);
        const data = await upsertDadoBancario({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          parceiroId: BigInt(id),
          input: body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  // ----- Produtos -----
  app.get('/api/v1/produtos', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-003 — Listar produtos' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.ler');
        const q = request.query as {
          q?: string;
          familia?: string;
          situacao?: string;
          limit?: string;
        };
        const data = await listarProdutos({
          empresaId: BigInt(request.user.empresaId),
          q: q.q,
          familia: q.familia as never,
          situacao: q.situacao,
          limit: q.limit ? Number(q.limit) : undefined,
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/produtos/:id', {
    schema: { tags: ['Cadastros'], summary: 'Obter produto' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.ler');
        const { id } = request.params as { id: string };
        return ok(reply, await obterProduto(BigInt(request.user.empresaId), BigInt(id)));
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/produtos', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-003 — Criar produto' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.escrever');
        const body = produtoBody.parse(request.body);
        const data = await criarProduto({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          input: body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.patch('/api/v1/produtos/:id', {
    schema: { tags: ['Cadastros'], summary: 'Atualizar / inativar produto' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.escrever');
        const { id } = request.params as { id: string };
        const body = produtoBody.partial().extend({
          situacao: z.enum(['ATIVO', 'INATIVO', 'BLOQUEADO']).optional(),
        }).parse(request.body);
        const data = await atualizarProduto({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          id: BigInt(id),
          input: body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/produtos/:id/fatores', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-005 — Fator de conversão' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.unidade.gerir');
        const { id } = request.params as { id: string };
        const body = z
          .object({
            unidadeDeCodigo: z.string(),
            unidadeParaCodigo: z.string(),
            fator: z.string(),
          })
          .parse(request.body);
        const data = await adicionarFator({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          produtoId: BigInt(id),
          ...body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  // ----- Unidades -----
  app.get('/api/v1/unidades', {
    schema: { tags: ['Cadastros'], summary: 'Listar unidades de medida' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.ler');
        return ok(reply, await listarUnidades());
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/unidades', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-005 — Criar unidade' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.unidade.gerir');
        const body = z
          .object({
            codigo: z.string().min(1),
            nome: z.string().min(1),
            casasDecimais: z.number().int().min(0).max(6).optional(),
          })
          .parse(request.body);
        const data = await criarUnidade({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          ...body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  // ----- FAC -----
  app.get('/api/v1/facas', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-004 — Listar facas/ferramental' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.ler');
        const q = request.query as { q?: string; parceiroClienteId?: string; limit?: string };
        const data = await listarFacas({
          empresaId: BigInt(request.user.empresaId),
          q: q.q,
          parceiroClienteId: q.parceiroClienteId ? BigInt(q.parceiroClienteId) : undefined,
          limit: q.limit ? Number(q.limit) : undefined,
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.post('/api/v1/facas', {
    schema: { tags: ['Cadastros'], summary: 'UC-CAD-004 — Criar FAC' },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.escrever');
        const body = z
          .object({
            descricao: z.string().min(2),
            modeloRef: z.string().nullable().optional(),
            parceiroClienteId: z.string().nullable().optional(),
            observacoes: z.string().nullable().optional(),
          })
          .parse(request.body);
        const data = await criarFaca({
          empresaId: BigInt(request.user.empresaId),
          usuarioId: BigInt(request.user.sub),
          input: body,
          ip: request.ip,
          correlationId: getCorrelationId(request),
        });
        return ok(reply, data, 201);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });

  app.get('/api/v1/facas/cobranca', {
    schema: {
      tags: ['Cadastros'],
      summary: 'Consultar se FAC já foi cobrado (cliente+modelo)',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      try {
        await assertSessaoAtiva(request.user.jti);
        assertPermissao(request.user.permissoes, 'cad.produto.ler');
        const q = z
          .object({
            parceiroClienteId: z.string(),
            modeloRef: z.string(),
          })
          .parse(request.query);
        const data = await consultarCobrancaFaca({
          empresaId: BigInt(request.user.empresaId),
          parceiroClienteId: BigInt(q.parceiroClienteId),
          modeloRef: q.modeloRef,
        });
        return ok(reply, data);
      } catch (err) {
        return sendError(reply, err);
      }
    },
  });
}
