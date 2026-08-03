import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote } from "@orcamento/pricing-engine";
import { getSession } from "@/lib/auth";
import { loadLookupsFromDb, loadParamsFromDb } from "@/lib/catalog";
import { calcularBodySchema, toQuoteInput } from "@/lib/orcamento-input";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = calcularBodySchema.parse(await req.json());
    const input = toQuoteInput(body);
    const [lookups, params] = await Promise.all([loadLookupsFromDb(), loadParamsFromDb()]);
    const result = calculateQuote(input, lookups, params);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Erro no cálculo";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
