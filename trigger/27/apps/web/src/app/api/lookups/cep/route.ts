import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { lookupCep } from "@/lib/lookups";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cep = req.nextUrl.searchParams.get("cep") || "";
  try {
    const data = await lookupCep(cep);
    return NextResponse.json(data);
  } catch (e) {
    const status = (e as { status?: number }).status || 502;
    const msg = e instanceof Error ? e.message : "Falha na consulta";
    return NextResponse.json({ error: msg }, { status });
  }
}
