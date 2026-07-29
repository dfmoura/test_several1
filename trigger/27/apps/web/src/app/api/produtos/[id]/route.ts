import { NextRequest, NextResponse } from "next/server";
import { TipoProduto } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseDocSaida, parseTipoProduto, serializeProduto } from "@/lib/produtos";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;

  const p = await prisma.produto.findUnique({
    where: { id },
    include: {
      papel: { select: { id: true, nome: true } },
      acabamento: { select: { id: true, nome: true } },
      tubete: { select: { id: true, tamanho: true } },
      fornecedores: true,
    },
  });
  if (!p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({
    ...serializeProduto(p),
    fornecedores: p.fornecedores,
  });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "COMPRAS", "PCP"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json();

  try {
    const updated = await prisma.produto.update({
      where: { id },
      data: {
        ...(body.codigo != null ? { codigo: String(body.codigo).trim().toUpperCase() } : {}),
        ...(body.descricao != null ? { descricao: String(body.descricao).trim() } : {}),
        ...(body.descricaoFiscal !== undefined
          ? { descricaoFiscal: body.descricaoFiscal?.trim() || null }
          : {}),
        ...(body.tipo != null ? { tipo: parseTipoProduto(body.tipo) } : {}),
        ...(body.unidade != null ? { unidade: String(body.unidade).trim() } : {}),
        ...(body.ncm !== undefined ? { ncm: body.ncm?.replace(/\D/g, "") || null } : {}),
        ...(body.cest !== undefined ? { cest: body.cest?.replace(/\D/g, "") || null } : {}),
        ...(body.origem != null ? { origem: Number(body.origem) || 0 } : {}),
        ...(body.cfopCompraPadrao !== undefined
          ? { cfopCompraPadrao: body.cfopCompraPadrao || null }
          : {}),
        ...(body.cfopVendaPadrao !== undefined
          ? { cfopVendaPadrao: body.cfopVendaPadrao || null }
          : {}),
        ...(body.cTribNac !== undefined ? { cTribNac: body.cTribNac || null } : {}),
        ...(body.cNbs !== undefined ? { cNbs: body.cNbs || null } : {}),
        ...(body.documentoSaidaPadrao != null
          ? { documentoSaidaPadrao: parseDocSaida(body.documentoSaidaPadrao) }
          : {}),
        ...(body.controlaEstoque != null ? { controlaEstoque: !!body.controlaEstoque } : {}),
        ...(body.estoqueMinimo != null ? { estoqueMinimo: Number(body.estoqueMinimo) || 0 } : {}),
        ...(body.papelId !== undefined ? { papelId: body.papelId || null } : {}),
        ...(body.acabamentoId !== undefined ? { acabamentoId: body.acabamentoId || null } : {}),
        ...(body.tubeteId !== undefined ? { tubeteId: body.tubeteId || null } : {}),
        ...(body.ativo != null ? { ativo: !!body.ativo } : {}),
        ...(body.observacoes !== undefined ? { observacoes: body.observacoes || null } : {}),
        ...(body.tipo === TipoProduto.SERVICO ? { controlaEstoque: false } : {}),
      },
      include: {
        papel: { select: { id: true, nome: true } },
        acabamento: { select: { id: true, nome: true } },
        tubete: { select: { id: true, tamanho: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Produto",
        entityId: id,
        action: "UPDATE",
        userId: session.id,
      },
    });

    return NextResponse.json(serializeProduto(updated));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await prisma.produto.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
