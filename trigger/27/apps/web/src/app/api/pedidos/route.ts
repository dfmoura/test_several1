import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/ciclo-params";
import { OS_STATUS_LABEL, PEDIDO_STATUS_LABEL, converterOrcamentoEmPedido } from "@/lib/pedido-venda";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const empresa = await requireEmpresaRaiz();
  const status = req.nextUrl.searchParams.get("status");

  const items = await prisma.pedidoVenda.findMany({
    where: {
      empresaId: empresa.id,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      ordensServico: { select: { id: true, numero: true, status: true } },
      docsSaida: { select: { status: true, numero: true, simulado: true } },
      tituloReceber: { select: { status: true, valor: true } },
    },
  });

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      numero: p.numero,
      status: p.status,
      statusLabel: PEDIDO_STATUS_LABEL[p.status],
      clienteNome: p.clienteNome,
      quantidade: dec(p.quantidade),
      valorTotal: dec(p.valorTotal),
      orcamentoId: p.orcamentoId,
      confirmadoEm: p.confirmadoEm?.toISOString() ?? null,
      faturadoEm: p.faturadoEm?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      ordensServico: p.ordensServico.map((o) => ({
        id: o.id,
        numero: o.numero,
        status: o.status,
        statusLabel: OS_STATUS_LABEL[o.status],
      })),
      docsSaida: p.docsSaida,
      tituloReceber: p.tituloReceber
        ? { status: p.tituloReceber.status, valor: dec(p.tituloReceber.valor) }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "VENDEDOR", "FINANCEIRO"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const orcamentoId = String(body.orcamentoId || "");
  const faixaIndex = Number(body.faixaIndex ?? 0);
  if (!orcamentoId) {
    return NextResponse.json({ error: "orcamentoId obrigatório" }, { status: 400 });
  }

  try {
    const pedido = await converterOrcamentoEmPedido({
      orcamentoId,
      faixaIndex,
      userId: session.id,
      condicaoPagamento: body.condicaoPagamento,
      prazoEntregaDias: body.prazoEntregaDias != null ? Number(body.prazoEntregaDias) : null,
      observacoes: body.observacoes,
    });
    return NextResponse.json(
      {
        id: pedido.id,
        numero: pedido.numero,
        status: pedido.status,
        statusLabel: PEDIDO_STATUS_LABEL[pedido.status],
        valorTotal: dec(pedido.valorTotal),
      },
      { status: 201 },
    );
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status },
    );
  }
}
