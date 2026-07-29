import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import { prisma } from "@/lib/db";
import { ajusteInventario, getDisponivel } from "@/lib/estoque";
import { ensureDepositoPadrao, dec } from "@/lib/ciclo-params";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const empresa = await requireEmpresaRaiz();
  const sp = req.nextUrl.searchParams;
  const produtoId = sp.get("produtoId");
  const view = sp.get("view") || "saldos";

  if (produtoId) {
    const s = await getDisponivel(empresa.id, produtoId);
    const movimentos = await prisma.estoqueMovimento.findMany({
      where: { empresaId: empresa.id, produtoId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      ...s,
      movimentos: movimentos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        quantidade: dec(m.quantidade),
        custoUnitario: m.custoUnitario != null ? dec(m.custoUnitario) : null,
        saldoApos: m.saldoApos != null ? dec(m.saldoApos) : null,
        documentoTipo: m.documentoTipo,
        documentoId: m.documentoId,
        observacao: m.observacao,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  }

  await ensureDepositoPadrao(empresa.id);

  if (view === "movimentos") {
    const tipoFiltro = sp.get("tipoProduto");
    const movimentos = await prisma.estoqueMovimento.findMany({
      where: {
        empresaId: empresa.id,
        ...(tipoFiltro
          ? { produto: { tipo: tipoFiltro as never } }
          : {}),
      },
      include: {
        produto: { select: { codigo: true, descricao: true, tipo: true, unidade: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      items: movimentos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        quantidade: dec(m.quantidade),
        custoUnitario: m.custoUnitario != null ? dec(m.custoUnitario) : null,
        saldoApos: m.saldoApos != null ? dec(m.saldoApos) : null,
        documentoTipo: m.documentoTipo,
        documentoId: m.documentoId,
        observacao: m.observacao,
        createdAt: m.createdAt.toISOString(),
        produtoId: m.produtoId,
        codigo: m.produto.codigo,
        descricao: m.produto.descricao,
        produtoTipo: m.produto.tipo,
        unidade: m.produto.unidade,
      })),
    });
  }

  const saldos = await prisma.estoqueSaldo.findMany({
    where: { empresaId: empresa.id },
    include: {
      produto: {
        select: { codigo: true, descricao: true, unidade: true, tipo: true, ativo: true },
      },
      deposito: { select: { codigo: true, nome: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  const tipo = sp.get("tipo");
  const filtered = tipo
    ? saldos.filter((s) => s.produto.tipo === tipo)
    : saldos;

  return NextResponse.json({
    items: filtered.map((s) => ({
      id: s.id,
      produtoId: s.produtoId,
      codigo: s.produto.codigo,
      descricao: s.produto.descricao,
      unidade: s.produto.unidade,
      tipo: s.produto.tipo,
      deposito: s.deposito.codigo,
      quantidade: dec(s.quantidade),
      reservado: dec(s.reservado),
      disponivel: dec(s.quantidade) - dec(s.reservado),
      custoMedio: dec(s.custoMedio),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const empresa = await requireEmpresaRaiz();
  try {
    const mov = await ajusteInventario({
      empresaId: empresa.id,
      produtoId: body.produtoId,
      quantidadeDelta: Number(body.quantidadeDelta),
      motivo: String(body.motivo || "Ajuste manual"),
      userId: session.id,
    });
    await prisma.auditLog.create({
      data: {
        entityType: "EstoqueMovimento",
        entityId: mov.id,
        action: "AJUSTE",
        newValue: body,
        userId: session.id,
      },
    });
    return NextResponse.json({ id: mov.id }, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status },
    );
  }
}
