import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { lookupIbgeMunicipios, lookupIbgeMunicipioPorCidadeUf } from "@/lib/lookups";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const cidade = req.nextUrl.searchParams.get("cidade")?.trim();
  const uf = req.nextUrl.searchParams.get("uf")?.trim();

  try {
    if (cidade && uf) {
      const codigo = await lookupIbgeMunicipioPorCidadeUf(cidade, uf);
      return NextResponse.json({ codigo });
    }

    if (q) {
      const municipios = await lookupIbgeMunicipios(q);
      return NextResponse.json({ municipios });
    }

    return NextResponse.json({ error: "Informe ?q=nome ou ?cidade=&uf=" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha na consulta IBGE";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
