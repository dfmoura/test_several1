import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/ciclo-params";
import {
  DOC_ENTRADA_ITEM_STATUS_LABEL,
  DOC_ENTRADA_STATUS_LABEL,
  NECESSIDADE_STATUS_LABEL,
  PEDIDO_COMPRA_STATUS_LABEL,
  cadastrarProdutoEVincularItem,
  cancelarPedidoCompra,
  criarPedidoCompraDasNecessidades,
  enviarPedidoCompra,
  importarXmlEntrada,
  lancarEstoqueEntrada,
  sugerirCodigoProduto,
  vincularItemEntrada,
} from "@/lib/compras";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const empresa = await requireEmpresaRaiz();
  const tipo = req.nextUrl.searchParams.get("tipo") || "resumo";

  if (tipo === "resumo" || tipo === "all") {
    const [necessidades, pedidos, entradas] = await Promise.all([
      prisma.necessidadeCompra.findMany({
        where: { empresaId: empresa.id, status: { in: ["ABERTA", "EM_COMPRA"] } },
        orderBy: { createdAt: "desc" },
        include: {
          produto: { select: { codigo: true } },
          pedidoVenda: { select: { id: true, numero: true, clienteNome: true } },
          pedidoCompra: { select: { id: true, numero: true, status: true } },
        },
      }),
      prisma.pedidoCompra.findMany({
        where: { empresaId: empresa.id, status: { not: "CANCELADO" } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          itens: {
            include: { produto: { select: { codigo: true } } },
            orderBy: { descricao: "asc" },
          },
          necessidades: {
            include: {
              pedidoVenda: { select: { numero: true, clienteNome: true } },
            },
          },
          docsEntrada: {
            select: {
              id: true,
              numero: true,
              status: true,
              valorTotal: true,
              emitenteNome: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.documentoFiscalEntrada.findMany({
        where: { empresaId: empresa.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          itens: {
            include: { produto: { select: { id: true, codigo: true, descricao: true } } },
            orderBy: { numeroItem: "asc" },
          },
          pedidoCompra: { select: { id: true, numero: true } },
        },
      }),
    ]);

    const abertas = necessidades.filter((n) => n.status === "ABERTA").length;
    const emCompra = necessidades.filter((n) => n.status === "EM_COMPRA").length;
    const pcsAbertos = pedidos.filter((p) =>
      ["RASCUNHO", "ENVIADO", "PARCIAL"].includes(p.status),
    ).length;
    const entradasPendentes = entradas.filter((d) =>
      ["VALIDANDO", "CONFERIDO", "RECEBIDO_XML"].includes(d.status),
    ).length;
    const entradasLancadas = entradas.filter((d) => d.status === "ESTOQUE_LANCADO").length;

    return NextResponse.json({
      kpi: {
        necessidadesAbertas: abertas,
        necessidadesEmCompra: emCompra,
        pedidosAbertos: pcsAbertos,
        entradasPendentes,
        entradasLancadas,
        entradasTotal: entradas.length,
      },
      necessidades: necessidades.map((n) => ({
        id: n.id,
        descricao: n.descricao,
        quantidade: dec(n.quantidade),
        unidade: n.unidade,
        status: n.status,
        statusLabel: NECESSIDADE_STATUS_LABEL[n.status],
        produtoId: n.produtoId,
        produtoCodigo: n.produto?.codigo ?? null,
        pedidoVendaId: n.pedidoVendaId,
        pedidoNumero: n.pedidoVenda?.numero ?? null,
        pedidoCliente: n.pedidoVenda?.clienteNome ?? null,
        pedidoCompraId: n.pedidoCompraId,
        pedidoCompraNumero: n.pedidoCompra?.numero ?? null,
      })),
      pedidos: pedidos.map((p) => serializePedidoCompra(p)),
      entradas: entradas.map((d) => serializeEntrada(d)),
    });
  }

  if (tipo === "necessidades") {
    const items = await prisma.necessidadeCompra.findMany({
      where: { empresaId: empresa.id, status: { in: ["ABERTA", "EM_COMPRA"] } },
      orderBy: { createdAt: "desc" },
      include: {
        produto: { select: { codigo: true } },
        pedidoVenda: { select: { id: true, numero: true, clienteNome: true } },
        pedidoCompra: { select: { id: true, numero: true } },
      },
    });
    return NextResponse.json({
      items: items.map((n) => ({
        id: n.id,
        descricao: n.descricao,
        quantidade: dec(n.quantidade),
        unidade: n.unidade,
        status: n.status,
        statusLabel: NECESSIDADE_STATUS_LABEL[n.status],
        produtoId: n.produtoId,
        produtoCodigo: n.produto?.codigo ?? null,
        pedidoVendaId: n.pedidoVendaId,
        pedidoNumero: n.pedidoVenda?.numero ?? null,
        pedidoCliente: n.pedidoVenda?.clienteNome ?? null,
        pedidoCompraId: n.pedidoCompraId,
        pedidoCompraNumero: n.pedidoCompra?.numero ?? null,
      })),
    });
  }

  if (tipo === "pedidos") {
    const items = await prisma.pedidoCompra.findMany({
      where: { empresaId: empresa.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        itens: {
          include: { produto: { select: { codigo: true } } },
          orderBy: { descricao: "asc" },
        },
        necessidades: {
          include: {
            pedidoVenda: { select: { numero: true, clienteNome: true } },
          },
        },
        docsEntrada: {
          select: {
            id: true,
            numero: true,
            status: true,
            valorTotal: true,
            emitenteNome: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return NextResponse.json({
      items: items.map((p) => serializePedidoCompra(p)),
    });
  }

  if (tipo === "entradas") {
    const items = await prisma.documentoFiscalEntrada.findMany({
      where: { empresaId: empresa.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        itens: {
          include: { produto: { select: { id: true, codigo: true, descricao: true } } },
          orderBy: { numeroItem: "asc" },
        },
        pedidoCompra: { select: { id: true, numero: true } },
      },
    });
    return NextResponse.json({
      items: items.map((d) => serializeEntrada(d)),
    });
  }

  return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
}

function serializePedidoCompra(p: {
  id: string;
  numero: number;
  status: keyof typeof PEDIDO_COMPRA_STATUS_LABEL;
  fornecedorNome: string | null;
  observacoes: string | null;
  enviadoEm: Date | null;
  recebidoEm: Date | null;
  createdAt: Date;
  itens: Array<{
    id: string;
    descricao: string;
    quantidade: unknown;
    unidade: string;
    valorUnitario: unknown;
    valorTotal: unknown;
    produtoId: string | null;
    produto?: { codigo: string } | null;
  }>;
  necessidades: Array<{
    id: string;
    pedidoVenda?: { numero: number; clienteNome: string } | null;
  }>;
  docsEntrada: Array<{
    id: string;
    numero: string | null;
    status: string;
    valorTotal: unknown;
    emitenteNome: string | null;
  }>;
}) {
  const pedidosOrigem = [
    ...new Map(
      p.necessidades
        .filter((n) => n.pedidoVenda)
        .map((n) => [
          n.pedidoVenda!.numero,
          {
            numero: n.pedidoVenda!.numero,
            clienteNome: n.pedidoVenda!.clienteNome,
          },
        ]),
    ).values(),
  ];

  return {
    id: p.id,
    numero: p.numero,
    status: p.status,
    statusLabel: PEDIDO_COMPRA_STATUS_LABEL[p.status],
    fornecedorNome: p.fornecedorNome,
    observacoes: p.observacoes,
    enviadoEm: p.enviadoEm?.toISOString() ?? null,
    recebidoEm: p.recebidoEm?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    qtdItens: p.itens.length,
    pedidosOrigem,
    itens: p.itens.map((i) => ({
      id: i.id,
      descricao: i.descricao,
      quantidade: dec(i.quantidade),
      unidade: i.unidade,
      valorUnitario: dec(i.valorUnitario),
      valorTotal: dec(i.valorTotal),
      produtoId: i.produtoId,
      produtoCodigo: i.produto?.codigo ?? null,
    })),
    docsEntrada: p.docsEntrada.map((d) => ({
      id: d.id,
      numero: d.numero,
      status: d.status,
      statusLabel:
        DOC_ENTRADA_STATUS_LABEL[d.status as keyof typeof DOC_ENTRADA_STATUS_LABEL] ||
        d.status,
      valorTotal: d.valorTotal != null ? dec(d.valorTotal) : null,
      emitenteNome: d.emitenteNome,
    })),
  };
}

function serializeEntrada(d: {
  id: string;
  chave: string | null;
  numero: string | null;
  serie: string | null;
  emitenteNome: string | null;
  emitenteCnpj: string | null;
  valorTotal: unknown;
  status: keyof typeof DOC_ENTRADA_STATUS_LABEL;
  createdAt: Date;
  pedidoCompraId?: string | null;
  pedidoCompra?: { id: string; numero: number } | null;
  itens: Array<{
    id: string;
    numeroItem: number;
    codigoXml: string | null;
    descricao: string;
    quantidade: unknown;
    unidade: string | null;
    valorUnitario: unknown;
    valorTotal: unknown;
    ncm: string | null;
    cfop: string | null;
    status: keyof typeof DOC_ENTRADA_ITEM_STATUS_LABEL;
    produtoId: string | null;
    produto?: { id: string; codigo: string; descricao: string } | null;
  }>;
}) {
  const pendentes = d.itens.filter((i) => i.status === "PENDENTE_MATCH").length;
  return {
    id: d.id,
    chave: d.chave,
    numero: d.numero,
    serie: d.serie,
    emitenteNome: d.emitenteNome,
    emitenteCnpj: d.emitenteCnpj,
    valorTotal: d.valorTotal != null ? dec(d.valorTotal) : null,
    status: d.status,
    statusLabel: DOC_ENTRADA_STATUS_LABEL[d.status],
    pendentesMatch: pendentes,
    podeLancar:
      ["CONFERIDO", "VALIDANDO"].includes(d.status) &&
      pendentes === 0 &&
      d.status !== "DIVERGENTE",
    createdAt: d.createdAt.toISOString(),
    pedidoCompraId: d.pedidoCompraId ?? d.pedidoCompra?.id ?? null,
    pedidoCompraNumero: d.pedidoCompra?.numero ?? null,
    itens: d.itens.map((i) => ({
      id: i.id,
      numeroItem: i.numeroItem,
      codigoXml: i.codigoXml,
      descricao: i.descricao,
      quantidade: dec(i.quantidade),
      unidade: i.unidade,
      valorUnitario: dec(i.valorUnitario),
      valorTotal: dec(i.valorTotal),
      ncm: i.ncm,
      cfop: i.cfop,
      status: i.status,
      statusLabel: DOC_ENTRADA_ITEM_STATUS_LABEL[i.status],
      produtoId: i.produtoId,
      produtoCodigo: i.produto?.codigo ?? null,
      produtoDescricao: i.produto?.descricao ?? null,
      codigoSugerido: sugerirCodigoProduto({
        codigoXml: i.codigoXml,
        ncm: i.ncm,
        descricao: i.descricao,
      }),
    })),
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "COMPRAS", "PCP"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action || "");

  try {
    if (action === "criar_pedido_compra") {
      const pc = await criarPedidoCompraDasNecessidades({
        necessidadeIds: body.necessidadeIds || [],
        fornecedorId: body.fornecedorId,
        userId: session.id,
      });
      return NextResponse.json(
        {
          id: pc.id,
          numero: pc.numero,
          status: pc.status,
          statusLabel: PEDIDO_COMPRA_STATUS_LABEL[pc.status],
          qtdItens: pc.itens.length,
        },
        { status: 201 },
      );
    }

    if (action === "enviar_pedido_compra") {
      const pc = await enviarPedidoCompra({
        pedidoCompraId: body.pedidoCompraId,
        userId: session.id,
        fornecedorNome: body.fornecedorNome,
        observacoes: body.observacoes,
      });
      return NextResponse.json({
        id: pc.id,
        numero: pc.numero,
        status: pc.status,
        statusLabel: PEDIDO_COMPRA_STATUS_LABEL[pc.status],
      });
    }

    if (action === "cancelar_pedido_compra") {
      const pc = await cancelarPedidoCompra({
        pedidoCompraId: body.pedidoCompraId,
        userId: session.id,
      });
      return NextResponse.json({
        id: pc.id,
        numero: pc.numero,
        status: pc.status,
        statusLabel: PEDIDO_COMPRA_STATUS_LABEL[pc.status],
      });
    }

    if (action === "importar_xml") {
      const xml = String(body.xml || "");
      if (!xml.includes("<")) {
        return NextResponse.json({ error: "XML inválido" }, { status: 400 });
      }
      const doc = await importarXmlEntrada({
        xml,
        userId: session.id,
        pedidoCompraId: body.pedidoCompraId,
      });
      return NextResponse.json(
        {
          id: doc.id,
          status: doc.status,
          statusLabel: DOC_ENTRADA_STATUS_LABEL[doc.status],
          chave: doc.chave,
          pedidoCompraId: doc.pedidoCompraId,
          itens: doc.itens.map((i) => ({
            id: i.id,
            descricao: i.descricao,
            status: i.status,
            statusLabel: DOC_ENTRADA_ITEM_STATUS_LABEL[i.status],
            produtoId: i.produtoId,
          })),
        },
        { status: 201 },
      );
    }

    if (action === "vincular_item") {
      const item = await vincularItemEntrada({
        itemId: body.itemId,
        produtoId: body.produtoId,
        userId: session.id,
        salvarCodigoFornecedor: body.salvarCodigoFornecedor !== false,
      });
      return NextResponse.json({ id: item.id, produtoId: item.produtoId, status: item.status });
    }

    if (action === "cadastrar_e_vincular") {
      const result = await cadastrarProdutoEVincularItem({
        itemId: body.itemId,
        userId: session.id,
        codigo: body.codigo,
        descricao: body.descricao,
        unidade: body.unidade,
        ncm: body.ncm,
        papelId: body.papelId || null,
        salvarCodigoFornecedor: body.salvarCodigoFornecedor !== false,
      });
      return NextResponse.json(
        {
          itemId: result.item.id,
          status: result.item.status,
          produto: {
            id: result.produto.id,
            codigo: result.produto.codigo,
            descricao: result.produto.descricao,
          },
        },
        { status: 201 },
      );
    }

    if (action === "lancar_estoque") {
      const doc = await lancarEstoqueEntrada({
        documentoId: body.documentoId,
        userId: session.id,
      });
      return NextResponse.json({
        id: doc.id,
        status: doc.status,
        statusLabel: DOC_ENTRADA_STATUS_LABEL[doc.status],
      });
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Erro",
        documentoId: (e as { documentoId?: string }).documentoId,
        pedidoCompraId: (e as { pedidoCompraId?: string }).pedidoCompraId,
        pedidoCompraNumero: (e as { pedidoCompraNumero?: number }).pedidoCompraNumero,
      },
      { status },
    );
  }
}
