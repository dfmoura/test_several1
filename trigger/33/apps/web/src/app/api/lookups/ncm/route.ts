import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { lookupNcm, searchNcm } from "@/lib/ncm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const codigo = sp.get("codigo");
  const q = sp.get("q");

  if (codigo) {
    const item = await lookupNcm(codigo);
    if (!item) return NextResponse.json({ error: "NCM não encontrado" }, { status: 404 });
    return NextResponse.json(item);
  }
  if (q) {
    const items = await searchNcm(q);
    return NextResponse.json({ items });
  }
  return NextResponse.json({ error: "Informe codigo ou q" }, { status: 400 });
}
