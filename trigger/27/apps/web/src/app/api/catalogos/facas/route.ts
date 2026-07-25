import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const take = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 100);

  const facas = await prisma.faca.findMany({
    where: q
      ? {
          OR: [
            { tamanho: { contains: q, mode: "insensitive" } },
            { formato: { contains: q, mode: "insensitive" } },
            { maquina: { contains: q, mode: "insensitive" } },
            { numero: { contains: q, mode: "insensitive" } },
            { cliente: { contains: q, mode: "insensitive" } },
            { notas: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    take,
    orderBy: [{ tamanho: "asc" }, { numero: "asc" }],
  });

  return NextResponse.json({
    facas: facas.map((f) => ({
      ...f,
      z: f.z != null ? Number(f.z) : null,
      puxada: f.puxada != null ? Number(f.puxada) : null,
      largura: f.largura != null ? Number(f.largura) : null,
      rep: f.rep != null ? Number(f.rep) : null,
    })),
  });
}
