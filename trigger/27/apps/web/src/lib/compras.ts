/** Entrada de compra: XML → matching → estoque. */

import {
  DocEntradaItemStatus,
  DocEntradaStatus,
  NecessidadeCompraStatus,
  PedidoCompraStatus,
  TipoProduto,
} from "@prisma/client";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { entradaCompra } from "@/lib/estoque";
import { parseNfeXml, validateNfeAgainstEmpresa } from "@/lib/nfe-xml";
import { prisma } from "@/lib/db";
import { reavaliarMateriaisOs } from "@/lib/pedido-venda";

export const DOC_ENTRADA_STATUS_LABEL: Record<DocEntradaStatus, string> = {
  RECEBIDO_XML: "XML recebido",
  VALIDANDO: "Aguardando vínculo",
  DIVERGENTE: "Divergente",
  CONFERIDO: "Conferido",
  ESTOQUE_LANCADO: "Estoque lançado",
  CANCELADO: "Cancelado",
};

export const DOC_ENTRADA_ITEM_STATUS_LABEL: Record<DocEntradaItemStatus, string> = {
  PENDENTE_MATCH: "Sem cadastro",
  MATCHED: "Vinculado",
  DIVERGENTE: "Divergente",
  IGNORADO: "Ignorado",
};

export const PEDIDO_COMPRA_STATUS_LABEL: Record<PedidoCompraStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado ao fornecedor",
  PARCIAL: "Recebimento parcial",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
};

export const NECESSIDADE_STATUS_LABEL: Record<NecessidadeCompraStatus, string> = {
  ABERTA: "Aberta",
  EM_COMPRA: "Em compra",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
};

/** Sugere código interno a partir do item da NFe (único por empresa). */
export function sugerirCodigoProduto(opts: {
  codigoXml: string | null;
  ncm: string | null;
  descricao: string;
}): string {
  const fromXml = (opts.codigoXml || "").trim().toUpperCase().replace(/\s+/g, "-");
  if (fromXml && /^[A-Z0-9._-]{2,40}$/.test(fromXml)) return fromXml;

  const ncm = (opts.ncm || "").replace(/\D/g, "").slice(0, 8);
  const slug = opts.descricao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const base = ["INS", ncm || "SEMNCM", slug || "ITEM"].filter(Boolean).join("-");
  return base.slice(0, 40);
}

async function matchProduto(opts: {
  empresaId: string;
  codigoXml: string | null;
  ean: string | null;
  ncm: string | null;
  descricao: string;
  fornecedorId?: string | null;
}) {
  if (opts.ean) {
    const byEan = await prisma.produtoFornecedor.findFirst({
      where: { ean: opts.ean, ativo: true, produto: { empresaId: opts.empresaId } },
      include: { produto: true },
    });
    if (byEan) return byEan.produtoId;
  }
  if (opts.codigoXml) {
    const byCod = await prisma.produtoFornecedor.findFirst({
      where: {
        codigoFornecedor: opts.codigoXml,
        ativo: true,
        produto: { empresaId: opts.empresaId },
        ...(opts.fornecedorId ? { fornecedorId: opts.fornecedorId } : {}),
      },
    });
    if (byCod) return byCod.produtoId;

    const byProdutoCodigo = await prisma.produto.findFirst({
      where: {
        empresaId: opts.empresaId,
        OR: [
          { codigo: opts.codigoXml },
          { sku: opts.codigoXml },
        ],
        ativo: true,
      },
    });
    if (byProdutoCodigo) return byProdutoCodigo.id;
  }
  if (opts.ncm) {
    const byNcm = await prisma.produto.findFirst({
      where: {
        empresaId: opts.empresaId,
        ncm: opts.ncm,
        ativo: true,
        descricao: { contains: opts.descricao.slice(0, 20), mode: "insensitive" },
      },
    });
    if (byNcm) return byNcm.id;
  }
  return null;
}

export async function importarXmlEntrada(opts: {
  xml: string;
  userId: string;
  pedidoCompraId?: string | null;
}) {
  const empresa = await requireEmpresaRaiz();
  const parsed = parseNfeXml(opts.xml);
  const validationErrors = validateNfeAgainstEmpresa(parsed, empresa.cnpj);

  if (parsed.chave) {
    const dup = await prisma.documentoFiscalEntrada.findUnique({
      where: { empresaId_chave: { empresaId: empresa.id, chave: parsed.chave } },
      include: {
        pedidoCompra: { select: { id: true, numero: true } },
        itens: { select: { id: true, status: true } },
      },
    });
    if (dup) {
      throw Object.assign(
        new Error(
          `Esta NFe já foi importada (chave …${parsed.chave.slice(-8)})${
            dup.pedidoCompra
              ? ` — vinculada ao PC #${dup.pedidoCompra.numero}`
              : ""
          }. Use "Carregar XML de exemplo" de novo para gerar uma chave nova, ou abra a entrada existente.`,
        ),
        {
          status: 409,
          documentoId: dup.id,
          pedidoCompraId: dup.pedidoCompraId,
          pedidoCompraNumero: dup.pedidoCompra?.numero ?? null,
        },
      );
    }
  }

  const status =
    validationErrors.length > 0 ? DocEntradaStatus.DIVERGENTE : DocEntradaStatus.VALIDANDO;

  const doc = await prisma.documentoFiscalEntrada.create({
    data: {
      empresaId: empresa.id,
      chave: parsed.chave,
      numero: parsed.numero,
      serie: parsed.serie,
      emitenteCnpj: parsed.emitenteCnpj,
      emitenteNome: parsed.emitenteNome,
      destinatarioCnpj: parsed.destinatarioCnpj,
      valorTotal: parsed.valorTotal,
      dataEmissao: parsed.dataEmissao,
      xmlBruto: opts.xml,
      status,
      fonte: "UPLOAD",
      pedidoCompraId: opts.pedidoCompraId || null,
      divergencias: validationErrors.length ? validationErrors : undefined,
      createdById: opts.userId,
      itens: {
        create: await Promise.all(
          parsed.itens.map(async (it) => {
            const produtoId = await matchProduto({
              empresaId: empresa.id,
              codigoXml: it.codigoXml,
              ean: it.ean,
              ncm: it.ncm,
              descricao: it.descricao,
            });
            return {
              numeroItem: it.numeroItem,
              codigoXml: it.codigoXml,
              descricao: it.descricao,
              ncm: it.ncm,
              cfop: it.cfop,
              unidade: it.unidade,
              quantidade: it.quantidade,
              valorUnitario: it.valorUnitario,
              valorTotal: it.valorTotal,
              produtoId,
              status: produtoId
                ? DocEntradaItemStatus.MATCHED
                : DocEntradaItemStatus.PENDENTE_MATCH,
            };
          }),
        ),
      },
    },
    include: { itens: true },
  });

  if (status === DocEntradaStatus.VALIDANDO) {
    const allMatched = doc.itens.every((i) => i.status === DocEntradaItemStatus.MATCHED);
    if (allMatched) {
      return prisma.documentoFiscalEntrada.update({
        where: { id: doc.id },
        data: { status: DocEntradaStatus.CONFERIDO },
        include: { itens: true },
      });
    }
  }

  return doc;
}

export async function vincularItemEntrada(opts: {
  itemId: string;
  produtoId: string;
  userId: string;
  salvarCodigoFornecedor?: boolean;
}) {
  const item = await prisma.docEntradaItem.findUnique({
    where: { id: opts.itemId },
    include: { documento: true },
  });
  if (!item) throw Object.assign(new Error("Item não encontrado"), { status: 404 });

  const produto = await prisma.produto.findFirst({
    where: { id: opts.produtoId, empresaId: item.documento.empresaId, ativo: true },
  });
  if (!produto) throw Object.assign(new Error("Produto não encontrado"), { status: 404 });

  const updated = await prisma.docEntradaItem.update({
    where: { id: item.id },
    data: { produtoId: opts.produtoId, status: DocEntradaItemStatus.MATCHED },
  });

  if (opts.salvarCodigoFornecedor && item.codigoXml) {
    await prisma.produtoFornecedor.upsert({
      where: {
        produtoId_codigoFornecedor: {
          produtoId: opts.produtoId,
          codigoFornecedor: item.codigoXml,
        },
      },
      create: {
        produtoId: opts.produtoId,
        codigoFornecedor: item.codigoXml,
        descricaoFornecedor: item.descricao,
        ativo: true,
      },
      update: { ativo: true, descricaoFornecedor: item.descricao },
    });
  }

  const siblings = await prisma.docEntradaItem.findMany({ where: { documentoId: item.documentoId } });
  const allOk = siblings.every(
    (s) =>
      (s.id === item.id ? DocEntradaItemStatus.MATCHED : s.status) ===
        DocEntradaItemStatus.MATCHED || s.status === DocEntradaItemStatus.IGNORADO,
  );
  const docOk =
    item.documento.status !== DocEntradaStatus.DIVERGENTE ||
    !(item.documento.divergencias as string[] | null)?.length;

  if (allOk && docOk) {
    await prisma.documentoFiscalEntrada.update({
      where: { id: item.documentoId },
      data: { status: DocEntradaStatus.CONFERIDO },
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "DocEntradaItem",
      entityId: item.id,
      action: "MATCH_PRODUTO",
      newValue: { produtoId: opts.produtoId },
      userId: opts.userId,
    },
  });

  return updated;
}

/**
 * Resolve PENDENTE_MATCH criando o produto (insumo) a partir do XML
 * e vinculando imediatamente — padrão ERP: “cadastrar na hora”.
 */
export async function cadastrarProdutoEVincularItem(opts: {
  itemId: string;
  userId: string;
  codigo?: string;
  descricao?: string;
  unidade?: string;
  ncm?: string | null;
  papelId?: string | null;
  salvarCodigoFornecedor?: boolean;
}) {
  const item = await prisma.docEntradaItem.findUnique({
    where: { id: opts.itemId },
    include: { documento: true },
  });
  if (!item) throw Object.assign(new Error("Item não encontrado"), { status: 404 });
  if (item.status === DocEntradaItemStatus.MATCHED && item.produtoId) {
    throw Object.assign(new Error("Item já vinculado a um produto"), { status: 400 });
  }

  const empresaId = item.documento.empresaId;
  let codigo = (opts.codigo || sugerirCodigoProduto({
    codigoXml: item.codigoXml,
    ncm: opts.ncm ?? item.ncm,
    descricao: opts.descricao || item.descricao,
  }))
    .trim()
    .toUpperCase();

  if (!codigo) {
    throw Object.assign(new Error("Código do produto é obrigatório"), { status: 400 });
  }

  // Garante unicidade sem forçar o usuário a inventar sufixo
  const existente = await prisma.produto.findUnique({
    where: { empresaId_codigo: { empresaId, codigo } },
  });
  if (existente) {
    codigo = `${codigo.slice(0, 34)}-${Date.now().toString(36).toUpperCase()}`.slice(0, 40);
  }

  const descricao = (opts.descricao || item.descricao).trim();
  if (!descricao) {
    throw Object.assign(new Error("Descrição é obrigatória"), { status: 400 });
  }

  const ncm = (opts.ncm ?? item.ncm)?.replace(/\D/g, "") || null;
  const unidade = (opts.unidade || item.unidade || "UN").trim().toUpperCase() || "UN";

  const produto = await prisma.produto.create({
    data: {
      empresaId,
      codigo,
      descricao,
      descricaoFiscal: item.descricao,
      tipo: TipoProduto.INSUMO,
      unidade,
      ncm,
      cfopCompraPadrao: item.cfop,
      controlaEstoque: true,
      papelId: opts.papelId || null,
      observacoes: `Criado na entrada NFe ${item.documento.numero || "—"} (chave ${item.documento.chave || "—"})`,
      ativo: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Produto",
      entityId: produto.id,
      action: "CREATE_FROM_NFE",
      newValue: {
        codigo,
        itemId: item.id,
        documentoId: item.documentoId,
        ncm,
      },
      userId: opts.userId,
    },
  });

  const linked = await vincularItemEntrada({
    itemId: item.id,
    produtoId: produto.id,
    userId: opts.userId,
    salvarCodigoFornecedor: opts.salvarCodigoFornecedor !== false,
  });

  return { produto, item: linked };
}

export async function lancarEstoqueEntrada(opts: { documentoId: string; userId: string }) {
  const doc = await prisma.documentoFiscalEntrada.findUnique({
    where: { id: opts.documentoId },
    include: { itens: true },
  });
  if (!doc) throw Object.assign(new Error("Documento não encontrado"), { status: 404 });
  if (doc.status === DocEntradaStatus.ESTOQUE_LANCADO) {
    throw Object.assign(new Error("Estoque já lançado"), { status: 400 });
  }
  if (doc.status === DocEntradaStatus.DIVERGENTE) {
    throw Object.assign(new Error("Documento divergente — corrija antes de lançar"), {
      status: 400,
    });
  }
  const pending = doc.itens.filter(
    (i) => i.status === DocEntradaItemStatus.PENDENTE_MATCH || !i.produtoId,
  );
  if (pending.length) {
    throw Object.assign(
      new Error(
        `${pending.length} item(ns) sem cadastro no estoque — cadastre ou vincule antes de lançar`,
      ),
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    for (const item of doc.itens) {
      if (item.status === DocEntradaItemStatus.IGNORADO || !item.produtoId) continue;
      await entradaCompra(tx, {
        empresaId: doc.empresaId,
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        custoUnitario: Number(item.valorUnitario),
        documentoId: doc.id,
        userId: opts.userId,
      });
    }

    const updated = await tx.documentoFiscalEntrada.update({
      where: { id: doc.id },
      data: { status: DocEntradaStatus.ESTOQUE_LANCADO, lancadoEm: new Date() },
      include: { itens: true },
    });

    if (doc.pedidoCompraId) {
      await tx.pedidoCompra.update({
        where: { id: doc.pedidoCompraId },
        data: { status: PedidoCompraStatus.RECEBIDO, recebidoEm: new Date() },
      });
      await tx.necessidadeCompra.updateMany({
        where: { pedidoCompraId: doc.pedidoCompraId },
        data: { status: NecessidadeCompraStatus.ATENDIDA },
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "DocumentoFiscalEntrada",
        entityId: doc.id,
        action: "LANCAR_ESTOQUE",
        userId: opts.userId,
      },
    });

    return updated;
  });

  // Reavalia OS de pedidos com necessidade aberta
  const necessidades = await prisma.necessidadeCompra.findMany({
    where: {
      empresaId: doc.empresaId,
      status: { in: [NecessidadeCompraStatus.ABERTA, NecessidadeCompraStatus.EM_COMPRA] },
      produtoId: { in: doc.itens.map((i) => i.produtoId!).filter(Boolean) },
    },
  });
  const pedidoIds = [...new Set(necessidades.map((n) => n.pedidoVendaId).filter(Boolean))] as string[];
  for (const pedidoId of pedidoIds) {
    const oss = await prisma.ordemServico.findMany({ where: { pedidoVendaId: pedidoId } });
    for (const os of oss) {
      await reavaliarMateriaisOs({ ordemServicoId: os.id, userId: opts.userId });
    }
  }

  return result;
}

export async function criarPedidoCompraDasNecessidades(opts: {
  necessidadeIds: string[];
  fornecedorId?: string | null;
  userId: string;
}) {
  const empresa = await requireEmpresaRaiz();
  const necs = await prisma.necessidadeCompra.findMany({
    where: {
      id: { in: opts.necessidadeIds },
      empresaId: empresa.id,
      status: NecessidadeCompraStatus.ABERTA,
    },
  });
  if (!necs.length) {
    throw Object.assign(new Error("Nenhuma necessidade aberta selecionada"), { status: 400 });
  }

  let fornecedorNome: string | null = null;
  if (opts.fornecedorId) {
    const f = await prisma.parceiro.findUnique({ where: { id: opts.fornecedorId } });
    fornecedorNome = f?.nome ?? null;
  }

  return prisma.$transaction(async (tx) => {
    // Consolida o mesmo produto (vários pedidos/orçamentos) em uma linha de compra
    const agrupado = new Map<
      string,
      {
        produtoId: string | null;
        descricao: string;
        unidade: string;
        quantidade: number;
        necessidadeIds: string[];
      }
    >();
    for (const n of necs) {
      const key = n.produtoId || `desc:${n.descricao}:${n.unidade}`;
      const prev = agrupado.get(key);
      if (prev) {
        prev.quantidade = Number(prev.quantidade) + Number(n.quantidade);
        prev.necessidadeIds.push(n.id);
      } else {
        agrupado.set(key, {
          produtoId: n.produtoId,
          descricao: n.descricao,
          unidade: n.unidade,
          quantidade: Number(n.quantidade),
          necessidadeIds: [n.id],
        });
      }
    }
    const linhas = [...agrupado.values()];

    const pc = await tx.pedidoCompra.create({
      data: {
        empresaId: empresa.id,
        fornecedorId: opts.fornecedorId || null,
        fornecedorNome,
        status: PedidoCompraStatus.RASCUNHO,
        createdById: opts.userId,
        itens: {
          create: linhas.map((l) => ({
            produtoId: l.produtoId,
            descricao: l.descricao,
            unidade: l.unidade,
            quantidade: l.quantidade,
          })),
        },
      },
      include: { itens: true },
    });

    await tx.necessidadeCompra.updateMany({
      where: { id: { in: necs.map((n) => n.id) } },
      data: {
        status: NecessidadeCompraStatus.EM_COMPRA,
        pedidoCompraId: pc.id,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "PedidoCompra",
        entityId: pc.id,
        action: "CREATE_FROM_NECESSIDADES",
        newValue: {
          necessidades: necs.length,
          linhasConsolidadas: linhas.length,
          pedidosOrigem: [
            ...new Set(necs.map((n) => n.pedidoVendaId).filter(Boolean)),
          ],
        },
        userId: opts.userId,
      },
    });

    return pc;
  });
}

export async function enviarPedidoCompra(opts: {
  pedidoCompraId: string;
  userId: string;
  fornecedorNome?: string | null;
  observacoes?: string | null;
}) {
  const pc = await prisma.pedidoCompra.findUnique({
    where: { id: opts.pedidoCompraId },
    include: { itens: true },
  });
  if (!pc) throw Object.assign(new Error("Pedido de compra não encontrado"), { status: 404 });
  if (pc.status !== PedidoCompraStatus.RASCUNHO && pc.status !== PedidoCompraStatus.ENVIADO) {
    throw Object.assign(new Error("Só rascunho/enviado pode ser atualizado neste passo"), {
      status: 400,
    });
  }
  if (!pc.itens.length) {
    throw Object.assign(new Error("Pedido sem itens"), { status: 400 });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.pedidoCompra.update({
      where: { id: pc.id },
      data: {
        status: PedidoCompraStatus.ENVIADO,
        enviadoEm: pc.enviadoEm || new Date(),
        fornecedorNome: opts.fornecedorNome?.trim() || pc.fornecedorNome,
        observacoes: opts.observacoes ?? pc.observacoes,
      },
      include: { itens: true },
    });
    await tx.auditLog.create({
      data: {
        entityType: "PedidoCompra",
        entityId: pc.id,
        action: "ENVIAR",
        newValue: { status: updated.status, fornecedorNome: updated.fornecedorNome },
        userId: opts.userId,
      },
    });
    return updated;
  });
}

export async function cancelarPedidoCompra(opts: {
  pedidoCompraId: string;
  userId: string;
}) {
  const pc = await prisma.pedidoCompra.findUnique({
    where: { id: opts.pedidoCompraId },
    include: { docsEntrada: true },
  });
  if (!pc) throw Object.assign(new Error("Pedido de compra não encontrado"), { status: 404 });
  if (pc.status === PedidoCompraStatus.RECEBIDO) {
    throw Object.assign(new Error("Pedido já recebido — não cancela sem estorno"), {
      status: 400,
    });
  }
  if (pc.docsEntrada.some((d) => d.status === DocEntradaStatus.ESTOQUE_LANCADO)) {
    throw Object.assign(new Error("Há entrada com estoque lançado"), { status: 400 });
  }

  return prisma.$transaction(async (tx) => {
    await tx.necessidadeCompra.updateMany({
      where: {
        pedidoCompraId: pc.id,
        status: NecessidadeCompraStatus.EM_COMPRA,
      },
      data: {
        status: NecessidadeCompraStatus.ABERTA,
        pedidoCompraId: null,
      },
    });
    const updated = await tx.pedidoCompra.update({
      where: { id: pc.id },
      data: { status: PedidoCompraStatus.CANCELADO },
    });
    await tx.auditLog.create({
      data: {
        entityType: "PedidoCompra",
        entityId: pc.id,
        action: "CANCELAR",
        userId: opts.userId,
      },
    });
    return updated;
  });
}
