import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote, type CoresValue, type QuoteInput } from "@orcamento/pricing-engine";
import { getSession } from "@/lib/auth";
import { loadLookupsFromDb, loadParamsFromDb } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";

const faixaSchema = z.object({
  quantidade: z.number().positive(),
  tipoParada: z.string().min(1),
});

const inputSchema = z.object({
  clienteNome: z.string().min(1),
  clienteParceiroId: z.string().optional().nullable(),
  vendedorNome: z.string().min(1),
  vendedorParceiroId: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  larguraPapel: z.number().positive(),
  puxada: z.number().positive(),
  cores: z.union([
    z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4),
    z.literal("4V"), z.literal(5), z.literal(6), z.literal(7), z.literal(8),
  ]),
  papel: z.string().min(1),
  acabamento: z.string().min(1),
  qtdeModelos: z.number().int().positive(),
  qtdeColunas: z.number().int().positive(),
  etiqPorRolo: z.number().int().positive(),
  tubete: z.string().min(1),
  z: z.number().nullable(),
  medida: z.string().optional(),
  formatoFaca: z.string().optional(),
  maquinaRoda: z.string().optional(),
  maquinaGrupo: z.string().min(1),
  impostoPct: z.number().min(0).max(100),
  matriz: z.boolean(),
  colunaRebobinacao: z.number().positive(),
  rpm: z.number().positive(),
  comissaoPct: z.number().min(0).max(100),
  faixas: z.array(faixaSchema).min(1).max(20),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const items = await prisma.orcamento.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { clienteNome: { contains: q, mode: "insensitive" } },
              { vendedorNome: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      numero: true,
      versao: true,
      status: true,
      clienteNome: true,
      vendedorNome: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = inputSchema.parse(await req.json());
    const quoteInput: QuoteInput = {
      larguraPapel: body.larguraPapel,
      puxada: body.puxada,
      cores: body.cores as CoresValue,
      papel: body.papel,
      acabamento: body.acabamento,
      qtdeModelos: body.qtdeModelos,
      qtdeColunas: body.qtdeColunas,
      etiqPorRolo: body.etiqPorRolo,
      tubete: body.tubete,
      z: body.z,
      maquinaGrupo: body.maquinaGrupo,
      impostoPct: body.impostoPct,
      matriz: body.matriz,
      colunaRebobinacao: body.colunaRebobinacao,
      rpm: body.rpm,
      comissaoPct: body.comissaoPct,
      faixas: body.faixas,
    };

    const [lookups, params, empresa] = await Promise.all([
      loadLookupsFromDb(),
      loadParamsFromDb(),
      getEmpresaRaiz(),
    ]);
    const result = calculateQuote(quoteInput, lookups, params);

    const created = await prisma.orcamento.create({
      data: {
        empresaId: empresa?.id ?? null,
        clienteNome: body.clienteNome,
        clienteParceiroId: body.clienteParceiroId || null,
        vendedorNome: body.vendedorNome,
        vendedorParceiroId: body.vendedorParceiroId || null,
        observacoes: body.observacoes || null,
        createdById: session.id,
        inputSnapshot: body as object,
        resultSnapshot: result as object,
        status: "RASCUNHO",
      },
    });

    return NextResponse.json({ id: created.id, numero: created.numero, result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Erro ao salvar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
