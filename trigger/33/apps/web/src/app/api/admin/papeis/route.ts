import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth";
import { writeAudit } from "@/lib/catalog";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const items = await prisma.papel.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      nome: p.nome,
      precoM2: Number(p.precoM2),
      ativo: p.ativo,
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  precoM2: z.number().positive(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, [Role.ADMIN]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = patchSchema.parse(await req.json());
  const current = await prisma.papel.findUnique({ where: { id: body.id } });
  if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const updated = await prisma.papel.update({
    where: { id: body.id },
    data: { precoM2: body.precoM2 },
  });

  await writeAudit({
    entityType: "Papel",
    entityId: updated.id,
    action: "UPDATE_PRICE",
    field: "precoM2",
    oldValue: Number(current.precoM2),
    newValue: body.precoM2,
    userId: session.id,
  });

  return NextResponse.json({
    id: updated.id,
    nome: updated.nome,
    precoM2: Number(updated.precoM2),
  });
}
