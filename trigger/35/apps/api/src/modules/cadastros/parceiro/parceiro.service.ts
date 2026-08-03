import type { IndIEDest, Prisma, TipoPessoa } from '@prisma/client';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { registrarAuditoria } from '../../plataforma/auditoria/audit.service.js';
import { nextCodigo } from '../shared/codigo.service.js';
import { assertCnpjOrCpf, avaliarCadastroFiscalCompleto, onlyDigits } from '../shared/documents.js';

const includeFull = {
  enderecos: true,
  contatos: true,
  dadosBancarios: true,
} as const;

export type ParceiroCreateInput = {
  tipoPessoa?: TipoPessoa;
  cnpjCpf?: string | null;
  razaoSocial: string;
  nomeFantasia?: string | null;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  indIEDest?: IndIEDest | null;
  ehProspect?: boolean;
  papelCliente?: boolean;
  papelFornecedor?: boolean;
  papelTransportadora?: boolean;
  papelColaborador?: boolean;
  papelBanco?: boolean;
  papelContador?: boolean;
  condicaoPagamentoPadrao?: string | null;
  formaPagamentoPreferida?: string | null;
  observacoes?: string | null;
  endereco?: {
    tipo?: 'FISCAL' | 'ENTREGA' | 'COBRANCA';
    logradouro: string;
    numero: string;
    complemento?: string | null;
    bairro: string;
    municipio: string;
    codigoIbge?: string | null;
    uf: string;
    cep: string;
  } | null;
  contato?: {
    nome: string;
    funcao?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    emailXml?: string | null;
  } | null;
};

function serializeParceiro(p: Prisma.ParceiroGetPayload<{ include: typeof includeFull }>) {
  return {
    id: p.id.toString(),
    empresaId: p.empresaId.toString(),
    codigo: p.codigo,
    tipoPessoa: p.tipoPessoa,
    cnpjCpf: p.cnpjCpf,
    razaoSocial: p.razaoSocial,
    nomeFantasia: p.nomeFantasia,
    inscricaoEstadual: p.inscricaoEstadual,
    inscricaoMunicipal: p.inscricaoMunicipal,
    indIEDest: p.indIEDest,
    situacao: p.situacao,
    ehProspect: p.ehProspect,
    cadastroFiscalCompleto: p.cadastroFiscalCompleto,
    papeis: {
      cliente: p.papelCliente,
      fornecedor: p.papelFornecedor,
      transportadora: p.papelTransportadora,
      colaborador: p.papelColaborador,
      banco: p.papelBanco,
      contador: p.papelContador,
    },
    condicaoPagamentoPadrao: p.condicaoPagamentoPadrao,
    formaPagamentoPreferida: p.formaPagamentoPreferida,
    observacoes: p.observacoes,
    enderecos: p.enderecos.map((e) => ({
      id: e.id.toString(),
      tipo: e.tipo,
      logradouro: e.logradouro,
      numero: e.numero,
      complemento: e.complemento,
      bairro: e.bairro,
      municipio: e.municipio,
      codigoIbge: e.codigoIbge,
      uf: e.uf,
      cep: e.cep,
      principal: e.principal,
    })),
    contatos: p.contatos.map((c) => ({
      id: c.id.toString(),
      nome: c.nome,
      funcao: c.funcao,
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      email: c.email,
      emailXml: c.emailXml,
      principal: c.principal,
    })),
    dadosBancarios: p.dadosBancarios.map((b) => ({
      id: b.id.toString(),
      bancoCodigo: b.bancoCodigo,
      bancoNome: b.bancoNome,
      agencia: b.agencia,
      conta: b.conta,
      tipoConta: b.tipoConta,
      pixChave: b.pixChave,
      pixTipo: b.pixTipo,
      ativo: b.ativo,
    })),
    criadoEm: p.criadoEm,
    atualizadoEm: p.atualizadoEm,
  };
}

export async function listarParceiros(params: {
  empresaId: bigint;
  q?: string;
  situacao?: string;
  papel?: string;
  limit?: number;
}) {
  const limit = params.limit ?? 50;
  const where: Prisma.ParceiroWhereInput = { empresaId: params.empresaId };
  if (params.situacao) where.situacao = params.situacao as never;
  if (params.papel === 'CLIENTE') where.papelCliente = true;
  if (params.papel === 'FORNECEDOR') where.papelFornecedor = true;
  if (params.papel === 'TRANSPORTADORA') where.papelTransportadora = true;
  if (params.q) {
    const digits = onlyDigits(params.q);
    where.OR = [
      { codigo: { contains: params.q, mode: 'insensitive' } },
      { razaoSocial: { contains: params.q, mode: 'insensitive' } },
      { nomeFantasia: { contains: params.q, mode: 'insensitive' } },
      ...(digits ? [{ cnpjCpf: { contains: digits } }] : []),
    ];
  }
  const rows = await prisma.parceiro.findMany({
    where,
    include: includeFull,
    orderBy: { codigo: 'asc' },
    take: limit,
  });
  return rows.map(serializeParceiro);
}

export async function obterParceiro(empresaId: bigint, id: bigint) {
  const p = await prisma.parceiro.findFirst({
    where: { id, empresaId },
    include: includeFull,
  });
  if (!p) throw new NotFoundError('Parceiro não encontrado');
  return serializeParceiro(p);
}

export async function criarParceiro(params: {
  empresaId: bigint;
  usuarioId: bigint;
  input: ParceiroCreateInput;
  ip?: string;
  correlationId?: string;
}) {
  const input = params.input;
  const tipoPessoa = input.tipoPessoa ?? 'PJ';
  const cnpjCpf = assertCnpjOrCpf(input.cnpjCpf, tipoPessoa);

  if (cnpjCpf) {
    const dup = await prisma.parceiro.findFirst({
      where: { empresaId: params.empresaId, cnpjCpf },
    });
    if (dup) {
      throw new ConflictError(
        `CNPJ/CPF já cadastrado em ${dup.codigo}`,
        'PARCEIRO_DOCUMENTO_DUPLICADO',
      );
    }
  }

  const temEndereco = Boolean(input.endereco);
  const ehProspect = input.ehProspect ?? false;
  const cadastroFiscalCompleto = avaliarCadastroFiscalCompleto({
    ehProspect,
    tipoPessoa,
    cnpjCpf,
    indIEDest: input.indIEDest ?? null,
    inscricaoEstadual: input.inscricaoEstadual ?? null,
    temEnderecoFiscal: temEndereco,
  });

  if (
    !input.papelCliente &&
    !input.papelFornecedor &&
    !input.papelTransportadora &&
    !input.papelColaborador &&
    !input.papelBanco &&
    !input.papelContador
  ) {
    throw new AppError('PAPEL_OBRIGATORIO', 'Informe ao menos um papel do parceiro', 400);
  }

  const codigo = await nextCodigo({ empresaId: params.empresaId, prefixo: 'PAR' });

  const created = await prisma.parceiro.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      tipoPessoa,
      cnpjCpf,
      razaoSocial: input.razaoSocial.trim(),
      nomeFantasia: input.nomeFantasia?.trim() || null,
      inscricaoEstadual: input.inscricaoEstadual?.trim() || null,
      inscricaoMunicipal: input.inscricaoMunicipal?.trim() || null,
      indIEDest: input.indIEDest ?? null,
      ehProspect,
      cadastroFiscalCompleto,
      papelCliente: Boolean(input.papelCliente),
      papelFornecedor: Boolean(input.papelFornecedor),
      papelTransportadora: Boolean(input.papelTransportadora),
      papelColaborador: Boolean(input.papelColaborador),
      papelBanco: Boolean(input.papelBanco),
      papelContador: Boolean(input.papelContador),
      condicaoPagamentoPadrao: input.condicaoPagamentoPadrao ?? null,
      formaPagamentoPreferida: input.formaPagamentoPreferida ?? null,
      observacoes: input.observacoes ?? null,
      enderecos: input.endereco
        ? {
            create: {
              tipo: input.endereco.tipo ?? 'FISCAL',
              logradouro: input.endereco.logradouro,
              numero: input.endereco.numero,
              complemento: input.endereco.complemento ?? null,
              bairro: input.endereco.bairro,
              municipio: input.endereco.municipio,
              codigoIbge: input.endereco.codigoIbge ?? null,
              uf: input.endereco.uf.toUpperCase(),
              cep: onlyDigits(input.endereco.cep),
              principal: true,
            },
          }
        : undefined,
      contatos: input.contato
        ? {
            create: {
              nome: input.contato.nome,
              funcao: input.contato.funcao ?? null,
              telefone: input.contato.telefone ?? null,
              whatsapp: input.contato.whatsapp ?? null,
              email: input.contato.email ?? null,
              emailXml: input.contato.emailXml ?? null,
              principal: true,
            },
          }
        : undefined,
    },
    include: includeFull,
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PARCEIRO_CRIAR',
    entidade: 'parceiro',
    entidadeId: created.id.toString(),
    paraJson: { codigo: created.codigo, razaoSocial: created.razaoSocial },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeParceiro(created);
}

export async function atualizarParceiro(params: {
  empresaId: bigint;
  usuarioId: bigint;
  id: bigint;
  input: Partial<ParceiroCreateInput> & { situacao?: 'ATIVO' | 'INATIVO' | 'BLOQUEADO' };
  ip?: string;
  correlationId?: string;
}) {
  const atual = await prisma.parceiro.findFirst({
    where: { id: params.id, empresaId: params.empresaId },
    include: includeFull,
  });
  if (!atual) throw new NotFoundError('Parceiro não encontrado');

  const tipoPessoa = params.input.tipoPessoa ?? atual.tipoPessoa;
  const cnpjCpf =
    params.input.cnpjCpf !== undefined
      ? assertCnpjOrCpf(params.input.cnpjCpf, tipoPessoa)
      : atual.cnpjCpf;

  if (cnpjCpf && cnpjCpf !== atual.cnpjCpf) {
    const dup = await prisma.parceiro.findFirst({
      where: { empresaId: params.empresaId, cnpjCpf, NOT: { id: atual.id } },
    });
    if (dup) {
      throw new ConflictError(
        `CNPJ/CPF já cadastrado em ${dup.codigo}`,
        'PARCEIRO_DOCUMENTO_DUPLICADO',
      );
    }
  }

  const ehProspect = params.input.ehProspect ?? atual.ehProspect;
  const indIEDest =
    params.input.indIEDest !== undefined ? params.input.indIEDest : atual.indIEDest;
  const ie =
    params.input.inscricaoEstadual !== undefined
      ? params.input.inscricaoEstadual
      : atual.inscricaoEstadual;
  const temEndereco =
    atual.enderecos.some((e) => e.tipo === 'FISCAL') || Boolean(params.input.endereco);

  const updated = await prisma.$transaction(async (tx) => {
    if (params.input.endereco) {
      await tx.parceiroEndereco.deleteMany({
        where: { parceiroId: atual.id, tipo: 'FISCAL', principal: true },
      });
      await tx.parceiroEndereco.create({
        data: {
          parceiroId: atual.id,
          tipo: params.input.endereco.tipo ?? 'FISCAL',
          logradouro: params.input.endereco.logradouro,
          numero: params.input.endereco.numero,
          complemento: params.input.endereco.complemento ?? null,
          bairro: params.input.endereco.bairro,
          municipio: params.input.endereco.municipio,
          codigoIbge: params.input.endereco.codigoIbge ?? null,
          uf: params.input.endereco.uf.toUpperCase(),
          cep: onlyDigits(params.input.endereco.cep),
          principal: true,
        },
      });
    }

    if (params.input.contato) {
      await tx.parceiroContato.create({
        data: {
          parceiroId: atual.id,
          nome: params.input.contato.nome,
          funcao: params.input.contato.funcao ?? null,
          telefone: params.input.contato.telefone ?? null,
          whatsapp: params.input.contato.whatsapp ?? null,
          email: params.input.contato.email ?? null,
          emailXml: params.input.contato.emailXml ?? null,
          principal: true,
        },
      });
    }

    const situacao = params.input.situacao ?? atual.situacao;
    return tx.parceiro.update({
      where: { id: atual.id },
      data: {
        tipoPessoa,
        cnpjCpf,
        razaoSocial: params.input.razaoSocial?.trim() ?? atual.razaoSocial,
        nomeFantasia:
          params.input.nomeFantasia !== undefined
            ? params.input.nomeFantasia?.trim() || null
            : atual.nomeFantasia,
        inscricaoEstadual: ie?.trim() || null,
        inscricaoMunicipal:
          params.input.inscricaoMunicipal !== undefined
            ? params.input.inscricaoMunicipal?.trim() || null
            : atual.inscricaoMunicipal,
        indIEDest,
        ehProspect,
        cadastroFiscalCompleto: avaliarCadastroFiscalCompleto({
          ehProspect,
          tipoPessoa,
          cnpjCpf,
          indIEDest,
          inscricaoEstadual: ie ?? null,
          temEnderecoFiscal: temEndereco,
        }),
        papelCliente: params.input.papelCliente ?? atual.papelCliente,
        papelFornecedor: params.input.papelFornecedor ?? atual.papelFornecedor,
        papelTransportadora: params.input.papelTransportadora ?? atual.papelTransportadora,
        papelColaborador: params.input.papelColaborador ?? atual.papelColaborador,
        papelBanco: params.input.papelBanco ?? atual.papelBanco,
        papelContador: params.input.papelContador ?? atual.papelContador,
        condicaoPagamentoPadrao:
          params.input.condicaoPagamentoPadrao !== undefined
            ? params.input.condicaoPagamentoPadrao
            : atual.condicaoPagamentoPadrao,
        formaPagamentoPreferida:
          params.input.formaPagamentoPreferida !== undefined
            ? params.input.formaPagamentoPreferida
            : atual.formaPagamentoPreferida,
        observacoes:
          params.input.observacoes !== undefined ? params.input.observacoes : atual.observacoes,
        situacao,
        inativadoEm: situacao === 'INATIVO' ? new Date() : null,
      },
      include: includeFull,
    });
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PARCEIRO_ATUALIZAR',
    entidade: 'parceiro',
    entidadeId: atual.id.toString(),
    deJson: { codigo: atual.codigo, situacao: atual.situacao },
    paraJson: { codigo: updated.codigo, situacao: updated.situacao },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return serializeParceiro(updated);
}

export async function inativarParceiro(params: {
  empresaId: bigint;
  usuarioId: bigint;
  id: bigint;
  ip?: string;
  correlationId?: string;
}) {
  return atualizarParceiro({
    ...params,
    input: { situacao: 'INATIVO', ehProspect: false },
  });
}

export async function upsertDadoBancario(params: {
  empresaId: bigint;
  usuarioId: bigint;
  parceiroId: bigint;
  input: {
    bancoCodigo: string;
    bancoNome?: string | null;
    agencia: string;
    conta: string;
    tipoConta?: string;
    pixChave?: string | null;
    pixTipo?: string | null;
  };
  ip?: string;
  correlationId?: string;
}) {
  const parceiro = await prisma.parceiro.findFirst({
    where: { id: params.parceiroId, empresaId: params.empresaId },
  });
  if (!parceiro) throw new NotFoundError('Parceiro não encontrado');

  const row = await prisma.parceiroDadoBancario.create({
    data: {
      parceiroId: parceiro.id,
      bancoCodigo: params.input.bancoCodigo,
      bancoNome: params.input.bancoNome ?? null,
      agencia: params.input.agencia,
      conta: params.input.conta,
      tipoConta: params.input.tipoConta ?? 'CORRENTE',
      pixChave: params.input.pixChave ?? null,
      pixTipo: params.input.pixTipo ?? null,
    },
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'PARCEIRO_BANCARIO_CRIAR',
    entidade: 'parceiro_dado_bancario',
    entidadeId: row.id.toString(),
    paraJson: {
      parceiroId: parceiro.id.toString(),
      banco: row.bancoCodigo,
      agencia: row.agencia,
      conta: '***' + row.conta.slice(-4),
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    id: row.id.toString(),
    bancoCodigo: row.bancoCodigo,
    bancoNome: row.bancoNome,
    agencia: row.agencia,
    conta: row.conta,
    tipoConta: row.tipoConta,
    pixChave: row.pixChave,
    pixTipo: row.pixTipo,
    ativo: row.ativo,
  };
}
