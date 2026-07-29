import { NextRequest, NextResponse } from "next/server";
import { TipoProduto } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { parseDocSaida, parseTipoProduto, serializeProduto } from "@/lib/produtos";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empresa = await requireEmpresaRaiz();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const ativo = sp.get("ativo");
  const tipo = sp.get("tipo") as TipoProduto | null;

  const items = await prisma.produto.findMany({
    where: {
      empresaId: empresa.id,
      ...(ativo === "false" ? { ativo: false } : ativo === "all" ? {} : { ativo: true }),
      ...(tipo && tipo in TipoProduto ? { tipo } : {}),
      ...(q
        ? {
            OR: [
              { codigo: { contains: q, mode: "insensitive" } },
              { descricao: { contains: q, mode: "insensitive" } },
              { ncm: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      papel: { select: { id: true, nome: true } },
      acabamento: { select: { id: true, nome: true } },
      tubete: { select: { id: true, tamanho: true } },
    },
    orderBy: [{ tipo: "asc" }, { codigo: "asc" }],
    take: 200,
  });

  return NextResponse.json({ items: items.map(serializeProduto) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "COMPRAS", "PCP"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const empresa = await requireEmpresaRaiz();
  const body = await req.json();
  const codigo = String(body.codigo || "").trim().toUpperCase();
  const descricao = String(body.descricao || "").trim();
  if (!codigo || !descricao) {
    return NextResponse.json({ error: "Código e descrição são obrigatórios" }, { status: 400 });
  }

  try {
    const tipo = body.tipo ? parseTipoProduto(body.tipo) : TipoProduto.INSUMO;
    const created = await prisma.produto.create({
      data: {
        empresaId: empresa.id,
        codigo,
        sku: body.sku?.trim() || null,
        descricao,
        descricaoFiscal: body.descricaoFiscal?.trim() || null,
        tipo,
        unidade: body.unidade?.trim() || "UN",
        ncm: body.ncm?.replace(/\D/g, "") || null,
        cest: body.cest?.replace(/\D/g, "") || null,
        origem: Number(body.origem) || 0,
        cfopCompraPadrao: body.cfopCompraPadrao || null,
        cfopVendaPadrao: body.cfopVendaPadrao || null,
        cTribNac: body.cTribNac || null,
        cNbs: body.cNbs || null,
        documentoSaidaPadrao: parseDocSaida(body.documentoSaidaPadrao),
        controlaEstoque: body.controlaEstoque !== false && tipo !== TipoProduto.SERVICO,
        estoqueMinimo: Number(body.estoqueMinimo) || 0,
        papelId: body.papelId || null,
        acabamentoId: body.acabamentoId || null,
        tubeteId: body.tubeteId || null,
        observacoes: body.observacoes || null,
        ativo: body.ativo !== false,
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
        entityId: created.id,
        action: "CREATE",
        newValue: { codigo, tipo },
        userId: session.id,
      },
    });

    return NextResponse.json(serializeProduto(created), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar produto";
    const status = msg.includes("Unique") ? 409 : 500;
    return NextResponse.json(
      { error: msg.includes("Unique") ? "Código já existe" : msg },
      { status },
    );
  }
}
