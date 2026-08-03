import { NextRequest, NextResponse } from "next/server";
import { TipoParceiro } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { getEmpresaRaiz, requireEmpresaRaiz } from "@/lib/empresa";
import { sugerirCodigoParceiro } from "@/lib/cadastro-codigo";
import { TIPOS_PARCEIRO } from "@/lib/parceiros";

/** GET /api/admin/parceiros/proximo-codigo?tipo=CLIENTE */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tipoParam = req.nextUrl.searchParams.get("tipo") || "CLIENTE";
  const tiposParam = req.nextUrl.searchParams.get("tipos");
  let tipos: TipoParceiro[] = [TipoParceiro.CLIENTE];

  if (tiposParam) {
    tipos = tiposParam
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter((t): t is TipoParceiro => TIPOS_PARCEIRO.includes(t as TipoParceiro));
  } else if (TIPOS_PARCEIRO.includes(tipoParam as TipoParceiro)) {
    tipos = [tipoParam as TipoParceiro];
  }

  if (!tipos.length) tipos = [TipoParceiro.CLIENTE];

  const empresa = (await getEmpresaRaiz()) ?? (await requireEmpresaRaiz());
  const codigo = await sugerirCodigoParceiro({ empresaId: empresa.id, tipos });

  return NextResponse.json({ codigo, tipos });
}
