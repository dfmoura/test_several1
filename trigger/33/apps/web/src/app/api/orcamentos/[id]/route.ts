import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote } from "@orcamento/pricing-engine";
import { getSession } from "@/lib/auth";
import { loadLookupsFromDb, loadParamsFromDb, writeAudit } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { orcamentoBodySchema, toQuoteInput } from "@/lib/orcamento-input";
import { ensureProspectParceiro } from "@/lib/orcamento-prospect";
import { assertOrcamentoMutavel, isOrcamentoMutavel } from "@/lib/orcamento-status";

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
    const body = orcamentoBodySchema.parse(await req.json());

    let clienteParceiroId = body.clienteParceiroId || null;
    if (!clienteParceiroId && body.isProspect) {
      const prospect = await ensureProspectParceiro({
        nome: body.clienteNome,
        documento: body.prospectDocumento,
        telefone: body.prospectTelefone,
        email: body.prospectEmail,
      });
      clienteParceiroId = prospect.id;
    }
    if (!clienteParceiroId && !body.isProspect) {
      return NextResponse.json(
        {
          error:
            "Selecione um cliente cadastrado ou marque como prospect (estudo 32 — texto livre proibido).",
          code: "CLIENTE_OBRIGATORIO",
        },
        { status: 400 },
      );
    }

    const quoteInput = toQuoteInput(body);
    const [lookups, params] = await Promise.all([loadLookupsFromDb(), loadParamsFromDb()]);
    const result = calculateQuote(quoteInput, lookups, params);

    const snapshot = {
      ...body,
      clienteParceiroId,
      isProspect: Boolean(body.isProspect),
    };

    const updated = await prisma.orcamento.update({
      where: { id },
      data: {
        clienteNome: body.clienteNome,
        clienteParceiroId,
        vendedorNome: body.vendedorNome,
        vendedorParceiroId: body.vendedorParceiroId || null,
        observacoes: body.observacoes || null,
        inputSnapshot: snapshot as object,
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
      const flat = e.flatten();
      const firstField = Object.entries(flat.fieldErrors).find(([, msgs]) => msgs?.length);
      const hint = firstField
        ? `${firstField[0]}: ${(firstField[1] as string[]).join(", ")}`
        : flat.formErrors[0];
      return NextResponse.json(
        {
          error: hint ? `Dados inválidos — ${hint}` : "Dados inválidos",
          details: flat,
        },
        { status: 400 },
      );
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
