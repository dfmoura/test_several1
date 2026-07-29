import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote, type CoresValue, type QuoteInput } from "@orcamento/pricing-engine";
import { getSession } from "@/lib/auth";
import { loadLookupsFromDb, loadParamsFromDb, writeAudit } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { assertOrcamentoMutavel, isOrcamentoMutavel } from "@/lib/orcamento-status";

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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const o = await prisma.orcamento.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      decididoPor: { select: { id: true, name: true, email: true } },
    },
  });
  if (!o) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    ...o,
    mutavel: isOrcamentoMutavel(o.status),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.orcamento.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    assertOrcamentoMutavel(existing.status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Imutável";
    const status = (e as { status?: number }).status || 409;
    return NextResponse.json({ error: msg, code: "ORCAMENTO_IMUTAVEL" }, { status });
  }

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

    const [lookups, params] = await Promise.all([loadLookupsFromDb(), loadParamsFromDb()]);
    const result = calculateQuote(quoteInput, lookups, params);

    const updated = await prisma.orcamento.update({
      where: { id },
      data: {
        clienteNome: body.clienteNome,
        clienteParceiroId: body.clienteParceiroId || null,
        vendedorNome: body.vendedorNome,
        vendedorParceiroId: body.vendedorParceiroId || null,
        observacoes: body.observacoes || null,
        inputSnapshot: body as object,
        resultSnapshot: result as object,
      },
    });

    await writeAudit({
      entityType: "Orcamento",
      entityId: id,
      action: "UPDATE",
      oldValue: { status: existing.status, clienteNome: existing.clienteNome },
      newValue: { status: updated.status, clienteNome: updated.clienteNome },
      userId: session.id,
    });

    return NextResponse.json({
      id: updated.id,
      numero: updated.numero,
      versao: updated.versao,
      status: updated.status,
      mutavel: isOrcamentoMutavel(updated.status),
      result,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: e.flatten() }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Erro ao atualizar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.orcamento.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    assertOrcamentoMutavel(existing.status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Imutável";
    const status = (e as { status?: number }).status || 409;
    return NextResponse.json({ error: msg, code: "ORCAMENTO_IMUTAVEL" }, { status });
  }

  await prisma.orcamento.delete({ where: { id } });
  await writeAudit({
    entityType: "Orcamento",
    entityId: id,
    action: "DELETE",
    oldValue: {
      numero: existing.numero,
      versao: existing.versao,
      status: existing.status,
      clienteNome: existing.clienteNome,
    },
    userId: session.id,
  });

  return NextResponse.json({ ok: true });
}
