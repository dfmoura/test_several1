import { NextRequest, NextResponse } from "next/server";
import { TipoProduto } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import {
  codigoProdutoDisponivel,
  normalizeCodigo,
  sugerirCodigoProdutoCadastro,
} from "@/lib/cadastro-codigo";
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
              { sku: { contains: q, mode: "insensitive" } },
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
  const tipo = body.tipo ? parseTipoProduto(body.tipo) : TipoProduto.INSUMO;
  const descricao = String(body.descricao || "").trim();
  if (!descricao) {
    return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 });
  }

  let codigo: string;
  if (String(body.codigo || "").trim()) {
    const norm = normalizeCodigo(body.codigo);
    if (!norm.ok) {
      return NextResponse.json({ error: norm.error }, { status: 400 });
    }
    codigo = norm.codigo;
  } else {
    codigo = await sugerirCodigoProdutoCadastro({ empresaId: empresa.id, tipo });
  }

  const livre = await codigoProdutoDisponivel({ empresaId: empresa.id, codigo });
  if (!livre) {
    return NextResponse.json(
      { error: `Código ${codigo} já está em uso nesta empresa` },
      { status: 409 },
    );
  }

  try {
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
        ean: body.ean?.replace(/\D/g, "") || null,
        csosn: body.csosn || null,
        cstIcms: body.cstIcms || null,
        cstPis: body.cstPis || null,
        cstCofins: body.cstCofins || null,
        tributacaoIss: body.tributacaoIss != null ? Number(body.tributacaoIss) : null,
        issRetido: Boolean(body.issRetido),
        codigoMunicipioPrestacao: body.codigoMunicipioPrestacao?.replace(/\D/g, "") || null,
        ibsCbsSituacaoTributaria: body.ibsCbsSituacaoTributaria || null,
        ibsCbsClassificacaoTributaria: body.ibsCbsClassificacaoTributaria || null,
        infAdProdPadrao: body.infAdProdPadrao || null,
        naturezaOperacaoId: body.naturezaOperacaoId || null,
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
