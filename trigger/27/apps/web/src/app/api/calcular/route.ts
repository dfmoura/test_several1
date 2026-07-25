import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote, type CoresValue, type QuoteInput } from "@orcamento/pricing-engine";
import { getSession } from "@/lib/auth";
import { loadLookupsFromDb, loadParamsFromDb } from "@/lib/catalog";

const faixaSchema = z.object({
  quantidade: z.number().positive(),
  tipoParada: z.string().min(1),
});

const schema = z.object({
  larguraPapel: z.number().positive(),
  puxada: z.number().positive(),
  cores: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal("4V"),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ]),
  papel: z.string().min(1),
  acabamento: z.string().min(1),
  qtdeModelos: z.number().int().positive(),
  qtdeColunas: z.number().int().positive(),
  etiqPorRolo: z.number().int().positive(),
  tubete: z.string().min(1),
  z: z.number().nullable(),
  maquinaGrupo: z.string().min(1),
  impostoPct: z.number().min(0).max(100),
  matriz: z.boolean(),
  colunaRebobinacao: z.number().positive(),
  rpm: z.number().positive(),
  comissaoPct: z.number().min(0).max(100),
  faixas: z.array(faixaSchema).min(1).max(20),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const input: QuoteInput = {
      ...body,
      cores: body.cores as CoresValue,
    };
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
