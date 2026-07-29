import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const fmt = req.nextUrl.searchParams.get("fmt") || "xml";

  const doc = await prisma.documentoFiscalEntrada.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (fmt === "xml") {
    return new NextResponse(doc.xmlBruto, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `inline; filename="nfe-entrada-${doc.numero || id}.xml"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ error: "PDF de entrada: use o XML ou anexe DANFE externo" }, { status: 400 });
}
