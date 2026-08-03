import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { gerarOuReutilizarLinkAprovacao } from "@/lib/aprovacao-cliente";
import { formatOrcamento } from "@/lib/codigos-documento";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  try {
    const { link, orcamento, reutilizado } = await gerarOuReutilizarLinkAprovacao({
      orcamentoId: id,
      canalEnvio: body.canalEnvio ? String(body.canalEnvio) : null,
      destinoEnvio: body.destinoEnvio ? String(body.destinoEnvio) : null,
    });

    const origin = req.nextUrl.origin;
    const url = `${origin}/aprovacao/${link.token}`;
    const codigo = formatOrcamento(orcamento);

    return NextResponse.json({
      url,
      token: link.token,
      codigo,
      expiraEm: link.expiraEm.toISOString(),
      reutilizado,
    });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status },
    );
  }
}
