import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { OS_STATUS_LABEL } from "@/lib/pedido-venda";
import { concluirProducao, iniciarProducao } from "@/lib/producao";
import { dec } from "@/lib/ciclo-params";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const empresa = await requireEmpresaRaiz();
  const status = req.nextUrl.searchParams.get("status");

  const items = await prisma.ordemServico.findMany({
    where: {
      empresaId: empresa.id,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      pedido: { select: { id: true, numero: true, clienteNome: true } },
      necessidades: true,
    },
  });

  return NextResponse.json({
    items: items.map((o) => ({
      id: o.id,
      numero: o.numero,
      status: o.status,
      statusLabel: OS_STATUS_LABEL[o.status],
      pedidoId: o.pedido.id,
      pedidoNumero: o.pedido.numero,
      clienteNome: o.pedido.clienteNome,
      iniciadoEm: o.iniciadoEm?.toISOString() ?? null,
      concluidoEm: o.concluidoEm?.toISOString() ?? null,
      materiaisOk: o.necessidades.every((n) => n.status === "OK" || n.status === "ATENDIDA"),
      necessidadesCount: o.necessidades.length,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PCP", "ORCAMENTISTA"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  try {
    if (action === "iniciar") {
      const os = await iniciarProducao({ ordemServicoId: id, userId: session.id });
      return NextResponse.json({
        id: os.id,
        status: os.status,
        statusLabel: OS_STATUS_LABEL[os.status],
      });
    }
    if (action === "concluir") {
      const os = await concluirProducao({ ordemServicoId: id, userId: session.id });
      return NextResponse.json({
        id: os.id,
        status: os.status,
        statusLabel: OS_STATUS_LABEL[os.status],
        necessidades: os.necessidades.map((n) => ({
          id: n.id,
          status: n.status,
          qtdAtendida: dec(n.qtdAtendida),
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
