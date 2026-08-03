import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  aprovarPeloLink,
  obterPropostaPublica,
  recusarPeloLink,
} from "@/lib/aprovacao-cliente";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  try {
    const proposta = await obterPropostaPublica(token);
    return NextResponse.json(proposta);
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status },
    );
  }
}

const postSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("APROVAR"),
    faixaIndex: z.number().int().min(0),
    nomeCliente: z.string().min(2).max(200),
    motivo: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    acao: z.literal("RECUSAR"),
    motivo: z.string().max(2000).optional().nullable(),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent");

  try {
    const body = postSchema.parse(await req.json());

    if (body.acao === "APROVAR") {
      const result = await aprovarPeloLink({
        token,
        faixaIndex: body.faixaIndex,
        nomeCliente: body.nomeCliente,
        observacao: body.motivo,
        ip,
        userAgent,
      });
      return NextResponse.json(result);
    }

    const result = await recusarPeloLink({
      token,
      motivo: body.motivo,
      ip,
      userAgent,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status },
    );
  }
}
