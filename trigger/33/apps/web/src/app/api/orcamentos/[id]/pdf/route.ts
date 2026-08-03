import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadComercialParamsFromDb } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { getEmpresaRaiz } from "@/lib/empresa";
import type {
  OrcamentoInputSnapshot,
  OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";
import { buildOrcamentoPdf } from "@/lib/pdf-orcamento";
import { writeAudit } from "@/lib/catalog";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const o = await prisma.orcamento.findUnique({ where: { id } });
  if (!o) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (!o.resultSnapshot) {
    return NextResponse.json(
      { error: "Orçamento sem cálculo — salve o consolidado antes de gerar o PDF" },
      { status: 400 },
    );
  }

  const [empresa, comercial] = await Promise.all([
    getEmpresaRaiz(),
    loadComercialParamsFromDb(),
  ]);

  const pdf = await buildOrcamentoPdf({
    numero: o.numero,
    versao: o.versao,
    status: o.status,
    data: o.data,
    clienteNome: o.clienteNome,
    vendedorNome: o.vendedorNome,
    observacoes: o.observacoes,
    input: o.inputSnapshot as OrcamentoInputSnapshot,
    result: o.resultSnapshot as OrcamentoResultSnapshot,
    comercial,
    empresa,
  });

  await writeAudit({
    entityType: "Orcamento",
    entityId: id,
    action: "PDF",
    newValue: { bytes: pdf.length },
    userId: session.id,
  });

  const filename = `proposta-${o.numero}-v${o.versao}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
