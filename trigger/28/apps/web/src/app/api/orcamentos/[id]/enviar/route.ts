import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { isOrcamentoMutavel, STATUS_LABEL } from "@/lib/orcamento-status";

type Ctx = { params: Promise<{ id: string }> };

/** RASCUNHO → ENVIADO (aguarda aprovação). Mantém mutabilidade até a decisão. */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.orcamento.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (!isOrcamentoMutavel(existing.status)) {
    return NextResponse.json(
      {
        error: `Orçamento ${STATUS_LABEL[existing.status].toLowerCase()} não pode ser reenviado`,
        code: "ORCAMENTO_IMUTAVEL",
      },
      { status: 409 },
    );
  }

  if (existing.status === "ENVIADO") {
    return NextResponse.json({
      id: existing.id,
      status: existing.status,
      statusLabel: STATUS_LABEL.ENVIADO,
      mutavel: true,
      already: true,
    });
  }

  if (!existing.resultSnapshot) {
    return NextResponse.json(
      { error: "Calcule e salve o orçamento antes de enviar para aprovação" },
      { status: 400 },
    );
  }

  const updated = await prisma.orcamento.update({
    where: { id },
    data: {
      status: "ENVIADO",
      enviadoEm: new Date(),
    },
  });

  await writeAudit({
    entityType: "Orcamento",
    entityId: id,
    action: "ENVIAR",
    field: "status",
    oldValue: { status: existing.status },
    newValue: { status: updated.status, enviadoEm: updated.enviadoEm?.toISOString() },
    userId: session.id,
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    statusLabel: STATUS_LABEL[updated.status],
    enviadoEm: updated.enviadoEm,
    mutavel: true,
  });
}
