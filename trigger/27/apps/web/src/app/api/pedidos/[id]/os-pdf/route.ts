import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";
import { OS_STATUS_LABEL } from "@/lib/pedido-venda";
import { buildOrdemServicoPdf } from "@/lib/pdf-docs";
import { specsFromInput } from "@/lib/pedido-specs";
import type { OrcamentoInputSnapshot } from "@/lib/orcamento-comercial";

type Ctx = { params: Promise<{ id: string }> };

/** PDF da OS: /api/pedidos/[id]/os-pdf  ou  ?osId= */
export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const osId = req.nextUrl.searchParams.get("osId");

  const pedido = await prisma.pedidoVenda.findUnique({
    where: { id },
    include: {
      ordensServico: {
        include: { necessidades: { include: { produto: true } } },
        orderBy: { numero: "asc" },
      },
    },
  });
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  const os =
    (osId ? pedido.ordensServico.find((o) => o.id === osId) : null) ||
    pedido.ordensServico[0];
  if (!os) {
    return NextResponse.json({ error: "Ordem de serviço não encontrada" }, { status: 404 });
  }

  const empresa = await getEmpresaRaiz();
  const input = pedido.inputSnapshot as OrcamentoInputSnapshot;
  const tecnico = (os.tecnicoSnapshot || {}) as Record<string, unknown>;

  const specs = specsFromInput(input);
  if (tecnico && typeof tecnico === "object") {
    for (const [k, v] of Object.entries(tecnico)) {
      if (v == null || specs.some((s) => s.label.toLowerCase() === k.toLowerCase())) continue;
      specs.push({ label: k, value: String(v) });
    }
  }

  const pdf = await buildOrdemServicoPdf({
    empresa,
    osNumero: os.numero,
    osStatus: OS_STATUS_LABEL[os.status],
    pedidoNumero: pedido.numero,
    clienteNome: pedido.clienteNome,
    vendedorNome: pedido.vendedorNome,
    createdAt: os.createdAt,
    iniciadoEm: os.iniciadoEm,
    concluidoEm: os.concluidoEm,
    quantidade: Number(pedido.quantidade),
    specs,
    materiais: os.necessidades.map((n) => ({
      descricao: n.descricao,
      unidade: n.unidade,
      qtdNecessaria: Number(n.qtdNecessaria),
      qtdReservada: Number(n.qtdReservada),
      status: n.status,
      produtoCodigo: n.produto?.codigo,
    })),
    observacoes: pedido.observacoes,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="os-${os.numero}-pedido-${pedido.numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
