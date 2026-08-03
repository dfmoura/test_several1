import type { Prisma, TipoDocumentoFiscal } from '@prisma/client';
import { createHash } from 'node:crypto';
import { prisma } from '../../infrastructure/prisma/client.js';
import { nextCodigoDocumento } from '../cadastros/shared/codigo.service.js';
import { registrarAuditoria } from '../plataforma/auditoria/audit.service.js';
import { AppError, NotFoundError } from '../shared/errors/app-error.js';
import { Decimal, money, moneyToString, qty } from '../shared/decimal/money.js';
import { getFocusAdapter } from './focus/focus.factory.js';
import { gerarTituloDaNf } from '../financeiro/financeiro.service.js';
import { isFocusEmissaoHabilitada } from '../integracoes/kill-switch.js';

const includeDoc = {
  pedido: { include: { parceiro: true } },
  itens: { orderBy: { sequencia: 'asc' as const } },
  titulo: true,
};

function serializeDoc(
  d: Prisma.DocumentoFiscalGetPayload<{ include: typeof includeDoc }>,
) {
  return {
    id: d.id.toString(),
    codigo: d.codigo,
    tipo: d.tipo,
    status: d.status,
    serie: d.serie,
    numero: d.numero,
    chave44: d.chave44,
    protocolo: d.protocolo,
    valorTotal: moneyToString(new Decimal(d.valorTotal.toString())),
    naturezaOperacao: d.naturezaOperacao,
    idempotencyKey: d.idempotencyKey,
    adapter: d.adapter,
    xmlRef: d.xmlRef,
    pdfRef: d.pdfRef,
    rejeicaoCodigo: d.rejeicaoCodigo,
    rejeicaoMotivo: d.rejeicaoMotivo,
    autorizadoEm: d.autorizadoEm,
    canceladoEm: d.canceladoEm,
    protocoloCancelamento: d.protocoloCancelamento,
    cceSequencia: d.cceSequencia,
    criadoEm: d.criadoEm,
    pedido: {
      id: d.pedido.id.toString(),
      codigo: d.pedido.codigo,
      status: d.pedido.status,
      parceiro: {
        codigo: d.pedido.parceiro.codigo,
        razaoSocial: d.pedido.parceiro.razaoSocial,
      },
    },
    itens: d.itens.map((i) => ({
      sequencia: i.sequencia,
      pedidoItemId: i.pedidoItemId.toString(),
      produtoCodigo: i.produtoCodigo,
      descricao: i.descricao,
      tipoItem: i.tipoItem,
      quantidade: i.quantidade.toString(),
      unidadeCodigo: i.unidadeCodigo,
      valorUnitario: i.valorUnitario.toString(),
      valorTotal: i.valorTotal.toString(),
      cfop: i.cfop,
      csosn: i.csosn,
    })),
    tituloGerado: !!d.titulo,
    tituloCodigo: d.titulo?.codigo ?? null,
  };
}

async function focusHabilitado(empresaId: bigint) {
  return isFocusEmissaoHabilitada(empresaId);
}

async function itemFaturavel(
  empresaId: bigint,
  item: {
    id: bigint;
    tipoItem: string;
    produtoId: bigint | null;
  },
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  if (item.tipoItem === 'PRODUCAO') {
    const op = await prisma.ordemProducao.findUnique({
      where: { pedidoItemId: item.id },
    });
    if (!op || op.status !== 'CONCLUIDA') {
      return { ok: false, motivo: 'Item PRODUCAO exige OP CONCLUIDA' };
    }
    return { ok: true };
  }
  if (item.tipoItem === 'SERVICO') {
    const os = await prisma.ordemServico.findUnique({
      where: { pedidoItemId: item.id },
    });
    if (!os || os.status !== 'CONCLUIDA') {
      return { ok: false, motivo: 'Item SERVICO exige OS CONCLUIDA' };
    }
    return { ok: true };
  }
  if (item.tipoItem === 'REVENDA') {
    const sep = await prisma.movimentoEstoque.aggregate({
      where: {
        empresaId,
        pedidoItemId: item.id,
        motivo: 'SEPARACAO_PEDIDO',
        tipo: 'SAIDA',
      },
      _sum: { quantidade: true },
    });
    const q = new Decimal(sep._sum.quantidade?.toString() ?? '0');
    if (q.lte(0)) {
      return { ok: false, motivo: 'Item REVENDA exige separação de estoque' };
    }
    return { ok: true };
  }
  return { ok: false, motivo: 'Tipo de item não faturável' };
}

export async function listarDocumentosFiscais(params: {
  empresaId: bigint;
  pedidoId?: bigint;
  limit?: number;
}) {
  const rows = await prisma.documentoFiscal.findMany({
    where: {
      empresaId: params.empresaId,
      ...(params.pedidoId ? { pedidoId: params.pedidoId } : {}),
    },
    include: includeDoc,
    orderBy: { criadoEm: 'desc' },
    take: Math.min(params.limit ?? 50, 100),
  });
  return rows.map(serializeDoc);
}

export async function obterDocumentoFiscal(empresaId: bigint, id: bigint) {
  const d = await prisma.documentoFiscal.findFirst({
    where: { id, empresaId },
    include: includeDoc,
  });
  if (!d) throw new NotFoundError('Documento fiscal não encontrado');
  return serializeDoc(d);
}

export async function emitirDocumentoFiscal(params: {
  empresaId: bigint;
  usuarioId: bigint;
  pedidoId: bigint;
  pedidoItemIds?: string[] | null;
  idempotencyKey?: string | null;
  naturezaOperacao?: string | null;
  ip?: string;
  correlationId?: string;
}) {
  if (!(await focusHabilitado(params.empresaId))) {
    throw new AppError(
      'FOCUS_KILL_SWITCH',
      'Emissão Focus desabilitada por parâmetro focus_emissao_habilitada',
      403,
    );
  }

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: params.empresaId },
  });
  const pedido = await prisma.pedido.findFirst({
    where: { id: params.pedidoId, empresaId: params.empresaId },
    include: {
      parceiro: { include: { enderecos: true } },
      itens: true,
    },
  });
  if (!pedido) throw new NotFoundError('Pedido não encontrado');
  if (
    !['LIBERADO', 'EM_PRODUCAO', 'EM_SEPARACAO', 'FATURADO_PARCIAL'].includes(
      pedido.status,
    )
  ) {
    throw new AppError(
      'PED_NAO_FATURAVEL',
      `PED em ${pedido.status} não pode emitir NF`,
      400,
    );
  }
  if (!pedido.parceiro.cadastroFiscalCompleto) {
    throw new AppError('CADASTRO_FISCAL_INCOMPLETO', 'Parceiro sem cadastro fiscal completo', 400);
  }

  const wantedRaw = params.pedidoItemIds?.length
    ? pedido.itens.filter((i) => params.pedidoItemIds!.includes(i.id.toString()))
    : pedido.itens;
  if (wantedRaw.length === 0) {
    throw new AppError('ITENS_VAZIOS', 'Nenhum item selecionado para NF', 400);
  }

  // Só itens ainda não faturados e aptos; se misto sem seleção explícita → erro
  const candidates: typeof wantedRaw = [];
  for (const item of wantedRaw) {
    const check = await itemFaturavel(params.empresaId, item);
    if (check.ok) candidates.push(item);
  }
  if (candidates.length === 0) {
    throw new AppError(
      'NENHUM_ITEM_FATURAVEL',
      'Nenhum item apto (OP/OS concluída ou REVENDA separada)',
      400,
    );
  }

  const temServico = candidates.some((i) => i.tipoItem === 'SERVICO');
  const temMercadoria = candidates.some((i) => i.tipoItem !== 'SERVICO');
  const wanted = candidates;
  if (temServico && temMercadoria) {
    throw new AppError(
      'NF_MISTA',
      'Não misture SERVICO e mercadoria na mesma NF — informe pedidoItemIds de um único tipo (NFE ou NFS-e)',
      400,
    );
  }

  const itensKey = wanted
    .map((i) => i.id.toString())
    .sort()
    .join(',');
  const idem =
    params.idempotencyKey?.trim() ||
    createHash('sha256')
      .update(`nf:${params.empresaId}:${pedido.id}:${itensKey}`)
      .digest('hex')
      .slice(0, 64);

  const existente = await prisma.documentoFiscal.findUnique({
    where: { idempotencyKey: idem },
    include: includeDoc,
  });
  if (existente) {
    return { ...serializeDoc(existente), replay: true as const };
  }

  const jaFaturados = await prisma.documentoFiscalItem.findMany({
    where: {
      pedidoItemId: { in: wanted.map((i) => i.id) },
      documento: {
        empresaId: params.empresaId,
        status: { in: ['AUTORIZADA', 'PROCESSANDO'] },
      },
    },
    include: { documento: { select: { codigo: true, status: true } } },
  });
  if (jaFaturados.length > 0) {
    throw new AppError(
      'ITEM_JA_FATURADO',
      'Há itens já incluídos em NF autorizada ou em processamento',
      409,
      {
        pedidoItemIds: jaFaturados.map((j) => j.pedidoItemId.toString()),
        documentos: jaFaturados.map((j) => ({
          codigo: j.documento.codigo,
          status: j.documento.status,
        })),
      },
    );
  }

  const tipo: TipoDocumentoFiscal = temServico ? 'NFSE' : 'NFE';

  let valorTotal = money(0);
  const linhas: Array<{
    item: (typeof wanted)[0];
    cfop: string | null;
    csosn: string | null;
    ncm: string | null;
  }> = [];

  for (const item of wanted) {
    valorTotal = money(valorTotal.plus(new Decimal(item.valorTotal.toString())));
    let cfop: string | null = null;
    let csosn: string | null = null;
    let ncm: string | null = null;
    if (item.produtoId) {
      const prod = await prisma.produto.findUnique({ where: { id: item.produtoId } });
      cfop = prod?.cfopPadraoDentro ?? '5101';
      csosn = prod?.csosnPadrao ?? '102';
      ncm = prod?.ncm ?? null;
    }
    linhas.push({ item, cfop, csosn, ncm });
  }

  const codigo = await nextCodigoDocumento(params.empresaId, 'DF');
  const ufDest =
    pedido.parceiro.enderecos.find((e) => e.tipo === 'FISCAL')?.uf ?? null;

  const payloadEnvio = {
    tipo,
    pedidoCodigo: pedido.codigo,
    itens: linhas.map((l) => ({
      pedidoItemId: l.item.id.toString(),
      codigo: l.item.produtoCodigo,
      descricao: l.item.descricao,
      quantidade: qty(new Decimal(l.item.quantidade.toString())).toFixed(4),
      valorTotal: l.item.valorTotal.toString(),
      cfop: l.cfop,
      csosn: l.csosn,
    })),
    valorTotal: moneyToString(valorTotal),
  };

  const doc = await prisma.documentoFiscal.create({
    data: {
      empresaId: params.empresaId,
      codigo,
      tipo,
      status: 'PROCESSANDO',
      pedidoId: pedido.id,
      valorTotal: moneyToString(valorTotal),
      naturezaOperacao: params.naturezaOperacao ?? 'VENDA DE MERCADORIA',
      idempotencyKey: idem,
      adapter: getFocusAdapter().name,
      payloadEnvio: payloadEnvio as unknown as Prisma.InputJsonValue,
      emitidoPorId: params.usuarioId,
      itens: {
        create: linhas.map((l, idx) => ({
          pedidoItemId: l.item.id,
          sequencia: idx + 1,
          produtoCodigo: l.item.produtoCodigo,
          descricao: l.item.descricao,
          tipoItem: l.item.tipoItem,
          quantidade: l.item.quantidade,
          unidadeCodigo: l.item.unidadeCodigo,
          valorUnitario: l.item.precoUnitario,
          valorTotal: l.item.valorTotal,
          cfop: l.cfop,
          csosn: l.csosn,
        })),
      },
    },
    include: includeDoc,
  });

  const adapter = getFocusAdapter();
  const focusResult = await adapter.emitir({
    empresaCnpj: empresa.cnpj,
    tipo,
    naturezaOperacao: doc.naturezaOperacao,
    destinatario: {
      cnpjCpf: pedido.parceiro.cnpjCpf,
      razaoSocial: pedido.parceiro.razaoSocial,
      uf: ufDest,
    },
    itens: linhas.map((l) => ({
      codigo: l.item.produtoCodigo,
      descricao: l.item.descricao,
      ncm: l.ncm,
      cfop: l.cfop,
      csosn: l.csosn,
      quantidade: qty(new Decimal(l.item.quantidade.toString())).toFixed(4),
      unidade: l.item.unidadeCodigo,
      valorUnitario: l.item.precoUnitario.toString(),
      valorTotal: l.item.valorTotal.toString(),
    })),
    valorTotal: moneyToString(valorTotal),
    idempotencyKey: idem,
    referenciaInterna: codigo,
  });

  let atualizado;
  if (focusResult.ok) {
    atualizado = await prisma.documentoFiscal.update({
      where: { id: doc.id },
      data: {
        status: 'AUTORIZADA',
        serie: focusResult.serie,
        numero: focusResult.numero,
        chave44: focusResult.chave44,
        protocolo: focusResult.protocolo,
        focusRef: focusResult.focusRef,
        adapter: focusResult.adapter,
        xmlRef: focusResult.xmlRef,
        pdfRef: focusResult.pdfRef,
        payloadRetorno: focusResult.raw as Prisma.InputJsonValue,
        autorizadoEm: new Date(),
      },
      include: includeDoc,
    });

    // Atualiza PED sem criar TIT (M06)
    const itensPed = pedido.itens.length;
    const faturados = await prisma.documentoFiscalItem.findMany({
      where: {
        documento: { pedidoId: pedido.id, status: 'AUTORIZADA' },
      },
      select: { pedidoItemId: true },
      distinct: ['pedidoItemId'],
    });
    const novoStatus =
      faturados.length >= itensPed ? 'FATURADO' : 'FATURADO_PARCIAL';
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { status: novoStatus },
    });

    await prisma.outboxEvent.create({
      data: {
        empresaId: params.empresaId,
        tipo: 'NfEmitida',
        agregadoTipo: 'documento_fiscal',
        agregadoId: atualizado.id.toString(),
        payload: {
          codigo: atualizado.codigo,
          chave44: atualizado.chave44,
          pedidoCodigo: pedido.codigo,
          geraTitulo: true,
        },
        idempotencyKey: `nf-emitida-${atualizado.id}`,
      },
    });

    await gerarTituloDaNf({
      empresaId: params.empresaId,
      documentoFiscalId: atualizado.id,
      usuarioId: params.usuarioId,
      ip: params.ip,
      correlationId: params.correlationId,
    });

    atualizado = await prisma.documentoFiscal.findUniqueOrThrow({
      where: { id: atualizado.id },
      include: includeDoc,
    });
  } else {
    atualizado = await prisma.documentoFiscal.update({
      where: { id: doc.id },
      data: {
        status: 'REJEITADA',
        adapter: focusResult.adapter,
        rejeicaoCodigo: focusResult.codigo,
        rejeicaoMotivo: focusResult.mensagem,
        payloadRetorno: (focusResult.raw ?? {}) as Prisma.InputJsonValue,
      },
      include: includeDoc,
    });
  }

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: focusResult.ok ? 'FIS.NF.EMITIR' : 'FIS.NF.REJEITADA',
    entidade: 'DocumentoFiscal',
    entidadeId: atualizado.codigo,
    paraJson: {
      status: atualizado.status,
      chave44: atualizado.chave44,
      tituloGerado: !!atualizado.titulo,
      tituloCodigo: atualizado.titulo?.codigo ?? null,
      adapter: atualizado.adapter,
    },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  if (!focusResult.ok) {
    throw new AppError('FOCUS_REJEICAO', focusResult.mensagem, 422, {
      codigo: focusResult.codigo,
      documento: serializeDoc(atualizado),
    });
  }

  return { ...serializeDoc(atualizado), replay: false as const };
}

export async function obterArtefatosDocumentoFiscal(empresaId: bigint, id: bigint) {
  const d = await prisma.documentoFiscal.findFirst({
    where: { id, empresaId },
  });
  if (!d) throw new NotFoundError('Documento fiscal não encontrado');
  return {
    documentoId: d.id.toString(),
    codigo: d.codigo,
    xmlRef: d.xmlRef,
    pdfRef: d.pdfRef,
    manifesto: {
      tipo: d.tipo,
      chave44: d.chave44,
      status: d.status,
      adapter: d.adapter,
      cceSequencia: d.cceSequencia,
      canceladoEm: d.canceladoEm,
    },
  };
}

export async function cancelarDocumentoFiscal(params: {
  empresaId: bigint;
  usuarioId: bigint;
  documentoId: bigint;
  justificativa: string;
  idempotencyKey: string;
  ip?: string;
  correlationId?: string;
}) {
  if (!(await focusHabilitado(params.empresaId))) {
    throw new AppError('FOCUS_KILL_SWITCH', 'Emissão/cancelamento Focus desabilitado', 403);
  }

  const doc = await prisma.documentoFiscal.findFirst({
    where: { id: params.documentoId, empresaId: params.empresaId },
    include: includeDoc,
  });
  if (!doc) throw new NotFoundError('Documento fiscal não encontrado');
  if (doc.status !== 'AUTORIZADA') {
    throw new AppError('NF_NAO_CANCELAVEL', `NF em ${doc.status} não pode cancelar`, 400);
  }
  if (params.justificativa.trim().length < 15) {
    throw new AppError('JUSTIFICATIVA_CURTA', 'Justificativa mínima 15 caracteres', 400);
  }

  const idem = params.idempotencyKey.trim();
  const replay = await prisma.documentoFiscal.findFirst({
    where: {
      id: doc.id,
      status: 'CANCELADA',
      payloadRetorno: { path: ['cancelIdempotencyKey'], equals: idem },
    },
    include: includeDoc,
  });
  if (replay) return { ...serializeDoc(replay), replay: true as const };

  const adapter = getFocusAdapter();
  const result = await adapter.cancelar({
    focusRef: doc.focusRef ?? doc.codigo,
    chave44: doc.chave44 ?? '',
    justificativa: params.justificativa,
    idempotencyKey: idem,
  });

  if (!result.ok) {
    throw new AppError('FOCUS_CANCEL_REJEICAO', result.mensagem, 422, { codigo: result.codigo });
  }

  const updated = await prisma.documentoFiscal.update({
    where: { id: doc.id },
    data: {
      status: 'CANCELADA',
      canceladoEm: new Date(),
      protocoloCancelamento: result.protocoloCancelamento,
      payloadRetorno: {
        ...(doc.payloadRetorno as object),
        cancelamento: result.raw,
        cancelIdempotencyKey: idem,
      } as Prisma.InputJsonValue,
    },
    include: includeDoc,
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FIS.NF.CANCELAR',
    entidade: 'DocumentoFiscal',
    entidadeId: updated.codigo,
    paraJson: { protocolo: result.protocoloCancelamento },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return { ...serializeDoc(updated), replay: false as const };
}

export async function emitirCceDocumentoFiscal(params: {
  empresaId: bigint;
  usuarioId: bigint;
  documentoId: bigint;
  correcao: string;
  idempotencyKey: string;
  ip?: string;
  correlationId?: string;
}) {
  if (!(await focusHabilitado(params.empresaId))) {
    throw new AppError('FOCUS_KILL_SWITCH', 'Emissão Focus desabilitada', 403);
  }

  const doc = await prisma.documentoFiscal.findFirst({
    where: { id: params.documentoId, empresaId: params.empresaId },
    include: includeDoc,
  });
  if (!doc) throw new NotFoundError('Documento fiscal não encontrado');
  if (doc.status !== 'AUTORIZADA') {
    throw new AppError('NF_NAO_CCE', `NF em ${doc.status} não aceita CC-e`, 400);
  }
  if (params.correcao.trim().length < 15) {
    throw new AppError('CORRECAO_CURTA', 'Correção mínima 15 caracteres', 400);
  }

  const sequencia = (doc.cceSequencia ?? 0) + 1;
  const adapter = getFocusAdapter();
  const result = await adapter.emitirCce({
    focusRef: doc.focusRef ?? doc.codigo,
    chave44: doc.chave44 ?? '',
    correcao: params.correcao,
    sequencia,
    idempotencyKey: params.idempotencyKey,
  });

  if (!result.ok) {
    throw new AppError('FOCUS_CCE_REJEICAO', result.mensagem, 422, { codigo: result.codigo });
  }

  const updated = await prisma.documentoFiscal.update({
    where: { id: doc.id },
    data: {
      cceSequencia: sequencia,
      payloadRetorno: {
        ...(doc.payloadRetorno as object),
        [`cce_${sequencia}`]: result.raw,
      } as Prisma.InputJsonValue,
    },
    include: includeDoc,
  });

  await registrarAuditoria({
    empresaId: params.empresaId,
    usuarioId: params.usuarioId,
    acao: 'FIS.NF.CCE',
    entidade: 'DocumentoFiscal',
    entidadeId: updated.codigo,
    paraJson: { sequencia, protocolo: result.protocolo },
    ip: params.ip,
    correlationId: params.correlationId,
  });

  return {
    documento: serializeDoc(updated),
    cce: {
      sequencia: result.sequencia,
      protocolo: result.protocolo,
      xmlRef: result.xmlRef,
    },
  };
}
