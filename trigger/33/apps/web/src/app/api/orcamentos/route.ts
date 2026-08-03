import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateQuote } from "@orcamento/pricing-engine";
import { getSession } from "@/lib/auth";
import { loadLookupsFromDb, loadParamsFromDb } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";
import { orcamentoBodySchema, toQuoteInput } from "@/lib/orcamento-input";
import { ensureProspectParceiro } from "@/lib/orcamento-prospect";

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
    const [lookups, params, empresa] = await Promise.all([
      loadLookupsFromDb(),
      loadParamsFromDb(),
      getEmpresaRaiz(),
    ]);
    const result = calculateQuote(quoteInput, lookups, params);

    const snapshot = {
      ...body,
      clienteParceiroId,
      isProspect: Boolean(body.isProspect),
    };

    const created = await prisma.orcamento.create({
      data: {
        empresaId: empresa?.id ?? null,
        clienteNome: body.clienteNome,
        clienteParceiroId,
        vendedorNome: body.vendedorNome,
        vendedorParceiroId: body.vendedorParceiroId || null,
        observacoes: body.observacoes || null,
        createdById: session.id,
        inputSnapshot: snapshot as object,
        resultSnapshot: result as object,
        status: "RASCUNHO",
      },
    });

    return NextResponse.json({ id: created.id, numero: created.numero, result });
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
    const msg = e instanceof Error ? e.message : "Erro ao salvar";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
