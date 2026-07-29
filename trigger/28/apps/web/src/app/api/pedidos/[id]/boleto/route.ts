import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";
import { buildBolepixPdf } from "@/lib/pdf-docs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const fmt = req.nextUrl.searchParams.get("fmt") || "pdf";

  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id },
    include: {
      clienteParceiro: true,
      tituloReceber: { include: { cobranca: true } },
    },
  });
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  const titulo = pedido.tituloReceber;
  const cobranca = titulo?.cobranca;
  if (!titulo || !cobranca) {
    return NextResponse.json({ error: "Bolepix ainda não emitido" }, { status: 404 });
  }

  if (fmt !== "pdf") {
    return NextResponse.json({ error: "fmt inválido (pdf)" }, { status: 400 });
  }

  const empresa = await getEmpresaRaiz();
  if (!empresa) {
    return NextResponse.json({ error: "Empresa não cadastrada" }, { status: 404 });
  }

  const cli = pedido.clienteParceiro;
  const pdf = await buildBolepixPdf({
    empresa,
    pagadorNome: pedido.clienteNome,
    pagadorDoc: cli?.documento,
    pagadorEndereco: [cli?.logradouro, cli?.numero, cli?.cidade, cli?.uf]
      .filter(Boolean)
      .join(", "),
    valor: Number(titulo.valor),
    vencimento: titulo.vencimento,
    nossoNumero: cobranca.nossoNumero || String(pedido.numero),
    linhaDigitavel: cobranca.linhaDigitavel || "",
    pixCopiaECola: cobranca.pixCopiaECola,
    seuNumero: String(pedido.numero),
    simulado: cobranca.simulado,
    mensagem: `Pedido ${pedido.numero}`,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bolepix-pedido-${pedido.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
