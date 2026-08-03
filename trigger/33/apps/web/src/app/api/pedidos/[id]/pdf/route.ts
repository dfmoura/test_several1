import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";
import { getParametro, PARAM_KEYS } from "@/lib/ciclo-params";
import { OS_STATUS_LABEL, PEDIDO_STATUS_LABEL } from "@/lib/pedido-venda";
import { buildPedidoPdf } from "@/lib/pdf-docs";
import { specsFromInput } from "@/lib/pedido-specs";
import { planejarDocumentosSaida, type ItemFiscal } from "@/lib/fiscal-emissao";
import type { OrcamentoInputSnapshot } from "@/lib/orcamento-comercial";
import type { DocumentoSaidaPadrao } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;

  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id },
    include: {
      itens: { include: { produto: true } },
      ordensServico: true,
      docsSaida: true,
      clienteParceiro: true,
    },
  });
  if (!pedido) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const empresa = await getEmpresaRaiz();
  const os = pedido.ordensServico[0];
  const nfse = pedido.docsSaida.find((d) => d.tipo === "NFSE");
  const input = pedido.inputSnapshot as OrcamentoInputSnapshot;
  const docPadrao = await getParametro<string>(PARAM_KEYS.documentoPadrao, "NFE");
  const comercial = pedido.comercialSnapshot as {
    faixa?: { production?: { qtdeRolos?: number; metragemM2?: number; qtdeCaixas?: number } };
    producao?: { qtdeRolos?: number; metragemM2?: number; qtdeCaixas?: number };
  } | null;
  const producao = comercial?.faixa?.production || comercial?.producao || null;

  const itensFiscal: ItemFiscal[] = pedido.itens.map((it) => ({
    descricao: it.descricao,
    quantidade: Number(it.quantidade),
    unidade: it.unidade || "UN",
    valorUnitario: Number(it.valorUnitario),
    valorTotal: Number(it.valorTotal),
    ncm: it.produto?.ncm,
    cTribNac: it.produto?.cTribNac,
    cNbs: it.produto?.cNbs,
    codigo: it.produto?.codigo,
    tipoProduto: it.produto?.tipo,
    documentoSaidaPadrao: it.produto?.documentoSaidaPadrao,
  }));

  const plano = planejarDocumentosSaida({
    itens: itensFiscal,
    quantidadePedido: Number(pedido.quantidade),
    valorTotalPedido: Number(pedido.valorTotal),
    documentoPadraoEmpresa: docPadrao as DocumentoSaidaPadrao,
    inputSnapshot: input,
    producao,
  });

  const cli = pedido.clienteParceiro;
  const pdf = await buildPedidoPdf({
    empresa,
    numero: pedido.numero,
    statusLabel: PEDIDO_STATUS_LABEL[pedido.status],
    clienteNome: pedido.clienteNome,
    clienteDoc: cli?.documento,
    clienteEndereco: [cli?.logradouro, cli?.numero, cli?.cidade, cli?.uf]
      .filter(Boolean)
      .join(", "),
    vendedorNome: pedido.vendedorNome,
    quantidade: Number(pedido.quantidade),
    valorTotal: Number(pedido.valorTotal),
    condicaoPagamento: pedido.condicaoPagamento,
    prazoEntregaDias: pedido.prazoEntregaDias,
    createdAt: pedido.createdAt,
    observacoes: pedido.observacoes,
    specs: [
      ...specsFromInput(input),
      ...(producao?.qtdeRolos != null
        ? [{ label: "Rolos", value: String(producao.qtdeRolos) }]
        : []),
      ...(producao?.metragemM2 != null
        ? [{ label: "Metragem m²", value: String(producao.metragemM2) }]
        : []),
      ...(producao?.qtdeCaixas != null
        ? [{ label: "Caixas", value: String(producao.qtdeCaixas) }]
        : []),
    ],
    itens: pedido.itens.map((i) => ({
      descricao: i.descricao,
      quantidade: Number(i.quantidade),
      valorUnitario: Number(i.valorUnitario),
      valorTotal: Number(i.valorTotal),
      unidade: i.unidade,
    })),
    osNumero: os?.numero,
    osStatus: os ? OS_STATUS_LABEL[os.status] : null,
    fiscalResumo: plano.resumo,
    discriminacao: nfse?.discriminacao || plano.nfse?.discriminacao,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pedido-${pedido.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
