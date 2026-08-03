import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const maquina = req.nextUrl.searchParams.get("maquina")?.trim() || "";
  const formato = req.nextUrl.searchParams.get("formato")?.trim() || "";
  const soCompletas = req.nextUrl.searchParams.get("completas") !== "0";
  const take = Math.min(Number(req.nextUrl.searchParams.get("limit") || 80), 150);

  const facas = await prisma.faca.findMany({
    where: {
      AND: [
        q
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
          : {},
        maquina ? { maquina: { contains: maquina, mode: "insensitive" } } : {},
        formato ? { formato: { contains: formato, mode: "insensitive" } } : {},
        soCompletas
          ? {
              tamanho: { not: null },
              puxada: { not: null },
              z: { not: null },
            }
          : {},
      ],
    },
    take,
    orderBy: [{ tamanho: "asc" }, { numero: "asc" }],
  });

  const [maquinas, formatos] = await Promise.all([
    prisma.faca.findMany({
      where: { maquina: { not: null } },
      distinct: ["maquina"],
      select: { maquina: true },
      orderBy: { maquina: "asc" },
      take: 80,
    }),
    prisma.faca.findMany({
      where: { formato: { not: null } },
      distinct: ["formato"],
      select: { formato: true },
      orderBy: { formato: "asc" },
      take: 80,
    }),
  ]);

  return NextResponse.json({
    facas: facas.map((f) => ({
      ...f,
      z: f.z != null ? Number(f.z) : null,
      puxada: f.puxada != null ? Number(f.puxada) : null,
      largura: f.largura != null ? Number(f.largura) : null,
      rep: f.rep != null ? Number(f.rep) : null,
      completa: f.tamanho != null && f.puxada != null && f.z != null,
    })),
    filtros: {
      maquinas: maquinas.map((m) => m.maquina).filter(Boolean),
      formatos: formatos.map((f) => f.formato).filter(Boolean),
    },
  });
}
