import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/ciclo-params";
import { buildNfeEntradaExemploXml } from "@/lib/nfe-entrada-exemplo";

/**
 * GET /api/compras/exemplo-xml?pcId=... | ?pc=2
 * Gera XML alinhado aos itens reais do PedidoCompra, com chave única a cada request.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const pcId = req.nextUrl.searchParams.get("pcId");
  const pcNumero = req.nextUrl.searchParams.get("pc");
  const empresa = await requireEmpresaRaiz();

  const pedido = await prisma.pedidoCompra.findFirst({
    where: {
      empresaId: empresa.id,
      ...(pcId
        ? { id: pcId }
        : pcNumero
          ? { numero: Number(pcNumero) }
          : {}),
    },
    include: {
      itens: {
        include: { produto: { select: { codigo: true, ncm: true } } },
        orderBy: { descricao: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!pedido) {
    return NextResponse.json(
      { error: "Pedido de compra não encontrado. Informe pcId ou pc (número)." },
      { status: 404 },
    );
  }

  if (!pedido.itens.length) {
    return NextResponse.json(
      { error: `PC #${pedido.numero} sem itens — nada a gerar` },
      { status: 400 },
    );
  }

  try {
    const { xml, chave, numero, valorTotal } = buildNfeEntradaExemploXml({
      pedidoCompraNumero: pedido.numero,
      empresa,
      itens: pedido.itens.map((it) => ({
        codigo: it.produto?.codigo || `PC${pedido.numero}-${it.id.slice(-4)}`,
        descricao: it.descricao,
        unidade: it.unidade,
        quantidade: dec(it.quantidade),
        ncm: it.produto?.ncm,
        valorUnitario: dec(it.valorUnitario) || undefined,
      })),
    });

    const download = req.nextUrl.searchParams.get("download") === "1";
    const fileName = `nfe-entrada-pc-${pedido.numero}-${numero}.xml`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Pedido-Compra": String(pedido.numero),
        "X-Chave-Nfe": chave,
        "X-Valor-Total": String(valorTotal),
        ...(download
          ? { "Content-Disposition": `attachment; filename="${fileName}"` }
          : { "Content-Disposition": `inline; filename="${fileName}"` }),
      },
    });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao gerar XML" },
      { status },
    );
  }
}
