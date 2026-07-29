import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { isOrcamentoMutavel, STATUS_LABEL } from "@/lib/orcamento-status";

const bodySchema = z.discriminatedUnion("decisao", [
  z.object({
    decisao: z.literal("APROVAR"),
    motivo: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    decisao: z.literal("REPROVAR"),
    motivo: z.string().min(3, "Informe o motivo da reprovação").max(2000),
  }),
]);

type Ctx = { params: Promise<{ id: string }> };

/**
 * Decisão comercial final.
 * Só permitido enquanto o orçamento está pendente (RASCUNHO ou ENVIADO).
 * Após APROVADO/REPROVADO o registro fica imutável.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.orcamento.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (!isOrcamentoMutavel(existing.status)) {
    return NextResponse.json(
      {
        error: `Orçamento já ${STATUS_LABEL[existing.status].toLowerCase()} — decisão encerrada`,
        code: "ORCAMENTO_JA_DECIDIDO",
      },
      { status: 409 },
    );
  }

  try {
    const body = bodySchema.parse(await req.json());
    const now = new Date();
    const nextStatus = body.decisao === "APROVAR" ? "APROVADO" : "REPROVADO";

    const updated = await prisma.orcamento.update({
      where: { id },
      data: {
        status: nextStatus,
        decididoEm: now,
        decididoPorId: session.id,
        motivoDecisao: body.motivo?.trim() || null,
        enviadoEm: existing.enviadoEm ?? (existing.status === "RASCUNHO" ? now : existing.enviadoEm),
      },
    });

    await writeAudit({
      entityType: "Orcamento",
      entityId: id,
      action: body.decisao === "APROVAR" ? "APROVAR" : "REPROVAR",
      field: "status",
      oldValue: { status: existing.status },
      newValue: {
        status: updated.status,
        motivoDecisao: updated.motivoDecisao,
        decididoEm: updated.decididoEm?.toISOString(),
      },
      userId: session.id,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      statusLabel: STATUS_LABEL[updated.status],
      decididoEm: updated.decididoEm,
      motivoDecisao: updated.motivoDecisao,
      mutavel: false,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Erro na decisão";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
