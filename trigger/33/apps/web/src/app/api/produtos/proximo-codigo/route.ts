import { NextRequest, NextResponse } from "next/server";
import { TipoProduto } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { sugerirCodigoProdutoCadastro } from "@/lib/cadastro-codigo";
import { parseTipoProduto } from "@/lib/produtos";

/** GET /api/produtos/proximo-codigo?tipo=INSUMO */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empresa = await requireEmpresaRaiz();
  let tipo: TipoProduto = TipoProduto.INSUMO;
  try {
    tipo = parseTipoProduto(req.nextUrl.searchParams.get("tipo") || "INSUMO");
  } catch {
    tipo = TipoProduto.INSUMO;
  }

  const codigo = await sugerirCodigoProdutoCadastro({
    empresaId: empresa.id,
    tipo,
  });

  return NextResponse.json({ codigo, tipo });
}
