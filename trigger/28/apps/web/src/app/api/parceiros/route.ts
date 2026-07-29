import { NextRequest, NextResponse } from "next/server";
import { TipoParceiro } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parceiroInclude, serializeParceiro, TIPOS_PARCEIRO } from "@/lib/parceiros";

/**
 * Listagem operacional de parceiros (wizard / selects).
 * Qualquer usuário autenticado; filtra por tipo e só ativos por padrão.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tipoParam = req.nextUrl.searchParams.get("tipo");
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!tipoParam || !TIPOS_PARCEIRO.includes(tipoParam as TipoParceiro)) {
    return NextResponse.json(
      { error: "Informe tipo=CLIENTE|FORNECEDOR|VENDEDOR|USUARIO" },
      { status: 400 },
    );
  }

  const items = await prisma.parceiro.findMany({
    where: {
      ativo: true,
      tipos: { some: { tipo: tipoParam as TipoParceiro, ativo: true } },
      ...(q
        ? {
            OR: [
              { nome: { contains: q, mode: "insensitive" } },
              { documento: { contains: q.replace(/\D/g, "") } },
              { codigo: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: parceiroInclude,
    orderBy: { nome: "asc" },
    take: 300,
  });

  return NextResponse.json({
    items: items.map((p) => {
      const s = serializeParceiro(p);
      return {
        id: s.id,
        nome: s.nome,
        documentoFormatado: s.documentoFormatado,
        codigo: s.codigo,
        comissaoPadraoPct:
          s.tipos.find((t) => t.tipo === "VENDEDOR")?.comissaoPadraoPct ?? null,
      };
    }),
  });
}
