import { NextRequest, NextResponse } from "next/server";
import type { DocumentoSaidaPadrao } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dec, getParametro, PARAM_KEYS } from "@/lib/ciclo-params";
import {
  OS_STATUS_LABEL,
  PEDIDO_STATUS_LABEL,
  cancelarPedido,
  confirmarPedido,
  reavaliarMateriaisPedido,
} from "@/lib/pedido-venda";
import {
  planejarDocumentosSaida,
  checklistPreEmissao,
  resolveContextoFiscal,
  itemFiscalFromProdutoLinha,
  type ItemFiscal,
} from "@/lib/fiscal-emissao";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { specsFromInput } from "@/lib/pedido-specs";
import type { OrcamentoInputSnapshot } from "@/lib/orcamento-comercial";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;

  let p = await prisma.pedidoVenda.findUnique({
    where: { id },
    include: {
      itens: { include: { produto: true } },
      ordensServico: { include: { necessidades: { include: { produto: true } } } },
      necessidadesCompra: true,
      docsSaida: true,
      tituloReceber: { include: { cobranca: true } },
      entrega: true,
      orcamento: { select: { id: true, numero: true, versao: true } },
      clienteParceiro: true,
    },
  });
  if (!p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // ATP refresh: se há falta/parcial e já existe estoque (ex.: NFe lançada), reserva e libera OS
  const precisaAtp = p.ordensServico.some(
    (o) =>
      ["PLANEJADA", "AGUARDANDO_MATERIAL", "LIBERADA"].includes(o.status) &&
      o.necessidades.some((n) => n.status === "FALTA" || n.status === "PARCIAL"),
  );
  if (precisaAtp && ["CONFIRMADO", "EM_PRODUCAO"].includes(p.status)) {
    await reavaliarMateriaisPedido({ pedidoId: p.id, userId: session.id });
    const refreshed = await prisma.pedidoVenda.findUnique({
      where: { id },
      include: {
        itens: { include: { produto: true } },
        ordensServico: { include: { necessidades: { include: { produto: true } } } },
        necessidadesCompra: true,
        docsSaida: true,
        tituloReceber: { include: { cobranca: true } },
        entrega: true,
        orcamento: { select: { id: true, numero: true, versao: true } },
        clienteParceiro: true,
      },
    });
    if (refreshed) p = refreshed;
  }

  const compraIds = [
    ...new Set(
      p.necessidadesCompra.map((n) => n.pedidoCompraId).filter(Boolean) as string[],
    ),
  ];
  const docsEntrada = compraIds.length
    ? await prisma.documentoFiscalEntrada.findMany({
        where: {
          empresaId: p.empresaId,
          OR: [
            { pedidoCompraId: { in: compraIds } },
            { status: "ESTOQUE_LANCADO" },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { itens: { select: { descricao: true, quantidade: true, status: true } } },
      })
    : await prisma.documentoFiscalEntrada.findMany({
        where: { empresaId: p.empresaId, status: "ESTOQUE_LANCADO" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { itens: { select: { descricao: true, quantidade: true, status: true } } },
      });

  // Preferir entradas ligadas ao PC do pedido; senão as recentes lançadas (homolog visual)
  const docsEntradaFiltro = docsEntrada.filter(
    (d) =>
      (d.pedidoCompraId && compraIds.includes(d.pedidoCompraId)) ||
      d.status === "ESTOQUE_LANCADO",
  );

  const { buildPedidoFluxo } = await import("@/lib/pedido-fluxo");

  const payloadBase = {
    id: p.id,
    numero: p.numero,
    status: p.status,
    statusLabel: PEDIDO_STATUS_LABEL[p.status],
    clienteNome: p.clienteNome,
    vendedorNome: p.vendedorNome,
    quantidade: dec(p.quantidade),
    valorTotal: dec(p.valorTotal),
    condicaoPagamento: p.condicaoPagamento,
    prazoEntregaDias: p.prazoEntregaDias,
    faixaIndex: p.faixaIndex,
    observacoes: p.observacoes,
    orcamento: p.orcamento,
    confirmadoEm: p.confirmadoEm?.toISOString() ?? null,
    faturadoEm: p.faturadoEm?.toISOString() ?? null,
    entregueEm: p.entregueEm?.toISOString() ?? null,
    liquidadoEm: p.liquidadoEm?.toISOString() ?? null,
    canceladoEm: p.canceladoEm?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    itens: p.itens
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => ({
        id: i.id,
        descricao: i.descricao,
        quantidade: dec(i.quantidade),
        unidade: i.unidade,
        valorUnitario: dec(i.valorUnitario),
        valorTotal: dec(i.valorTotal),
        produtoId: i.produtoId,
        documentoSaidaPadrao: i.produto?.documentoSaidaPadrao ?? null,
        tipoProduto: i.produto?.tipo ?? null,
        ordem: i.ordem,
      })),
    specs: specsFromInput(p.inputSnapshot as OrcamentoInputSnapshot),
    ordensServico: p.ordensServico.map((o) => ({
      id: o.id,
      numero: o.numero,
      status: o.status,
      statusLabel: OS_STATUS_LABEL[o.status],
      iniciadoEm: o.iniciadoEm?.toISOString() ?? null,
      concluidoEm: o.concluidoEm?.toISOString() ?? null,
      tecnicoSnapshot: o.tecnicoSnapshot,
      necessidades: o.necessidades.map((n) => ({
        id: n.id,
        descricao: n.descricao,
        unidade: n.unidade,
        qtdNecessaria: dec(n.qtdNecessaria),
        qtdReservada: dec(n.qtdReservada),
        qtdAtendida: dec(n.qtdAtendida),
        status: n.status,
        produtoId: n.produtoId,
        produtoCodigo: n.produto?.codigo ?? null,
      })),
    })),
    necessidadesCompra: p.necessidadesCompra.map((n) => ({
      id: n.id,
      descricao: n.descricao,
      quantidade: dec(n.quantidade),
      unidade: n.unidade,
      status: n.status,
      produtoId: n.produtoId,
      pedidoCompraId: n.pedidoCompraId,
    })),
    docsEntrada: docsEntradaFiltro.map((d) => ({
      id: d.id,
      chave: d.chave,
      numero: d.numero,
      serie: d.serie,
      emitenteNome: d.emitenteNome,
      valorTotal: d.valorTotal != null ? dec(d.valorTotal) : null,
      status: d.status,
      lancadoEm: d.lancadoEm?.toISOString() ?? null,
      itens: d.itens.map((i) => ({
        descricao: i.descricao,
        quantidade: dec(i.quantidade),
        status: i.status,
      })),
    })),
    docsSaida: p.docsSaida.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      status: d.status,
      numero: d.numero,
      serie: d.serie,
      chave: d.chave,
      discriminacao: d.discriminacao,
      valorTotal: dec(d.valorTotal),
      simulado: d.simulado,
      autorizadoEm: d.autorizadoEm?.toISOString() ?? null,
      temXml: !!d.xmlBruto,
    })),
    docSaida: (() => {
      const d = p.docsSaida.find((x) => x.tipo === "NFSE") || p.docsSaida[0];
      if (!d) return null;
      return {
        id: d.id,
        tipo: d.tipo,
        status: d.status,
        numero: d.numero,
        serie: d.serie,
        chave: d.chave,
        discriminacao: d.discriminacao,
        valorTotal: dec(d.valorTotal),
        simulado: d.simulado,
        autorizadoEm: d.autorizadoEm?.toISOString() ?? null,
        temXml: !!d.xmlBruto,
      };
    })(),
    tituloReceber: p.tituloReceber
      ? {
          id: p.tituloReceber.id,
          valor: dec(p.tituloReceber.valor),
          vencimento: p.tituloReceber.vencimento.toISOString(),
          status: p.tituloReceber.status,
          pagoEm: p.tituloReceber.pagoEm?.toISOString() ?? null,
          cobranca: p.tituloReceber.cobranca
            ? {
                id: p.tituloReceber.cobranca.id,
                linhaDigitavel: p.tituloReceber.cobranca.linhaDigitavel,
                pixCopiaECola: p.tituloReceber.cobranca.pixCopiaECola,
                nossoNumero: p.tituloReceber.cobranca.nossoNumero,
                codigoSolicitacao: p.tituloReceber.cobranca.codigoSolicitacao,
                status: p.tituloReceber.cobranca.status,
                simulado: p.tituloReceber.cobranca.simulado,
                pagoEm: p.tituloReceber.cobranca.pagoEm?.toISOString() ?? null,
              }
            : null,
        }
      : null,
    entrega: p.entrega
      ? {
          id: p.entrega.id,
          dataEntrega: p.entrega.dataEntrega.toISOString(),
          volumes: p.entrega.volumes,
          rolos: p.entrega.rolos,
          caixas: p.entrega.caixas,
          modalidade: p.entrega.modalidade,
          observacoes: p.entrega.observacoes,
        }
      : null,
  };

  const fluxo = buildPedidoFluxo({
    status: p.status,
    createdAt: payloadBase.createdAt,
    confirmadoEm: payloadBase.confirmadoEm,
    faturadoEm: payloadBase.faturadoEm,
    entregueEm: payloadBase.entregueEm,
    liquidadoEm: payloadBase.liquidadoEm,
    valorTotal: payloadBase.valorTotal,
    ordensServico: payloadBase.ordensServico,
    necessidadesCompra: payloadBase.necessidadesCompra,
    docsSaida: payloadBase.docsSaida,
    docsEntrada: payloadBase.docsEntrada,
    tituloReceber: payloadBase.tituloReceber,
    entrega: payloadBase.entrega,
  });

  const docPadrao = await getParametro<string>(PARAM_KEYS.documentoPadrao, "NFSE");
  const inputSnap = p.inputSnapshot as OrcamentoInputSnapshot;
  const comercial = p.comercialSnapshot as {
    faixa?: { production?: { qtdeRolos?: number; metragemM2?: number; qtdeCaixas?: number } };
    producao?: { qtdeRolos?: number; metragemM2?: number; qtdeCaixas?: number };
  } | null;
  const producao = comercial?.faixa?.production || comercial?.producao || null;
  const itensFiscal: ItemFiscal[] = p.itens.map((it) =>
    itemFiscalFromProdutoLinha({
      id: it.id,
      descricao: it.descricao,
      quantidade: dec(it.quantidade),
      unidade: it.unidade || "UN",
      valorUnitario: dec(it.valorUnitario),
      valorTotal: dec(it.valorTotal),
      produto: it.produto,
    }),
  );
  const plano = planejarDocumentosSaida({
    itens: itensFiscal,
    quantidadePedido: dec(p.quantidade),
    valorTotalPedido: dec(p.valorTotal),
    documentoPadraoEmpresa: docPadrao as DocumentoSaidaPadrao,
    inputSnapshot: inputSnap,
    producao,
  });

  const empresa = await requireEmpresaRaiz();
  const ctxFiscal = await resolveContextoFiscal({
    empresa,
    clienteParceiro: p.clienteParceiro,
    clienteNome: p.clienteNome,
  });
  const checklistFiscal = checklistPreEmissao({ ctx: ctxFiscal, plano });

  return NextResponse.json({
    ...payloadBase,
    producao: producao
      ? {
          qtdeRolos: producao.qtdeRolos ?? null,
          metragemM2: producao.metragemM2 ?? null,
          qtdeCaixas: producao.qtdeCaixas ?? null,
        }
      : null,
    fluxo,
    fiscalPlanejado: {
      emitirNfse: plano.emitirNfse,
      emitirNfe: plano.emitirNfe,
      tipos: plano.tipos,
      labelCta: plano.labelCta,
      resumo: plano.resumo,
      valorNfse: plano.nfse?.valor ?? null,
      valorNfe: plano.nfe?.valor ?? null,
      discriminacao: plano.nfse?.discriminacao ?? null,
      checklist: checklistFiscal,
      pronto: checklistFiscal.every((c) => c.severidade !== "erro"),
    },
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "confirmar") {
      requireRole(session, ["ADMIN", "VENDEDOR", "PCP"]);
      const pedido = await confirmarPedido({ pedidoId: id, userId: session.id });
      return NextResponse.json({
        id: pedido.id,
        status: pedido.status,
        statusLabel: PEDIDO_STATUS_LABEL[pedido.status],
      });
    }
    if (action === "cancelar") {
      requireRole(session, ["ADMIN", "VENDEDOR"]);
      const pedido = await cancelarPedido({ pedidoId: id, userId: session.id });
      return NextResponse.json({
        id: pedido.id,
        status: pedido.status,
        statusLabel: PEDIDO_STATUS_LABEL[pedido.status],
      });
    }
    if (action === "reavaliar_materiais") {
      requireRole(session, ["ADMIN", "PCP", "COMPRAS", "VENDEDOR"]);
      const oss = await reavaliarMateriaisPedido({
        pedidoId: id,
        userId: session.id,
      });
      return NextResponse.json({
        ok: true,
        ordens: oss.map((o) => ({
          id: o.id,
          status: o.status,
          statusLabel: OS_STATUS_LABEL[o.status],
        })),
      });
    }
    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status },
    );
  }
}
