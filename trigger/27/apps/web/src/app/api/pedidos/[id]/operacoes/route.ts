import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { baixarTituloReceber, faturarPedido, registrarEntrega } from "@/lib/faturamento";
import { PEDIDO_STATUS_LABEL } from "@/lib/pedido-venda";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/ciclo-params";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "faturar");

  try {
    if (action === "faturar") {
      requireRole(session, ["ADMIN", "FINANCEIRO", "VENDEDOR"]);
      const result = await faturarPedido({ pedidoId: id, userId: session.id });
      return NextResponse.json({
        pedido: {
          id: result.pedido.id,
          status: result.pedido.status,
          statusLabel: PEDIDO_STATUS_LABEL[result.pedido.status],
        },
        docSaida: {
          id: result.docSaida.id,
          status: result.docSaida.status,
          numero: result.docSaida.numero,
          chave: result.docSaida.chave,
          simulado: result.docSaida.simulado,
          valorTotal: dec(result.docSaida.valorTotal),
        },
        titulo: {
          id: result.titulo.id,
          valor: dec(result.titulo.valor),
          vencimento: result.titulo.vencimento.toISOString(),
        },
        cobranca: {
          id: result.cobranca.id,
          linhaDigitavel: result.cobranca.linhaDigitavel,
          pixCopiaECola: result.cobranca.pixCopiaECola,
          simulado: result.cobranca.simulado,
        },
      });
    }

    if (action === "entregar") {
      requireRole(session, ["ADMIN", "EXPEDICAO", "VENDEDOR"]);
      const entrega = await registrarEntrega({
        pedidoId: id,
        userId: session.id,
        volumes: body.volumes != null ? Number(body.volumes) : null,
        rolos: body.rolos != null ? Number(body.rolos) : null,
        caixas: body.caixas != null ? Number(body.caixas) : null,
        modalidade: body.modalidade,
        observacoes: body.observacoes,
      });
      return NextResponse.json({
        id: entrega.id,
        dataEntrega: entrega.dataEntrega.toISOString(),
      });
    }

    if (action === "receber") {
      requireRole(session, ["ADMIN", "FINANCEIRO"]);
      const titulo = await prisma.tituloReceber.findUnique({ where: { pedidoVendaId: id } });
      if (!titulo) return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
      const t = await baixarTituloReceber({
        tituloId: titulo.id,
        userId: session.id,
        via: body.via || "manual",
      });
      return NextResponse.json({
        id: t.id,
        status: t.status,
        pagoEm: t.pagoEm?.toISOString() ?? null,
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
