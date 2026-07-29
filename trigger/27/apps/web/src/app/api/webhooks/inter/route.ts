import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { baixarTituloReceber } from "@/lib/faturamento";

/** Webhook Inter cobrança paga. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const codigo =
    String(body.codigoSolicitacao || body.codigo_solicitacao || body.nossoNumero || "");
  const situacao = String(body.situacao || body.status || "").toUpperCase();

  if (!codigo) return NextResponse.json({ ok: true, ignored: true });

  const cobranca = await prisma.cobrancaInter.findFirst({
    where: {
      OR: [{ codigoSolicitacao: codigo }, { nossoNumero: codigo }],
    },
  });
  if (!cobranca) return NextResponse.json({ ok: true, notFound: true });

  if (situacao.includes("PAGO") || situacao === "RECEBIDO" || body.pago === true) {
    await baixarTituloReceber({
      tituloId: cobranca.tituloReceberId,
      userId: "webhook-inter",
      via: "webhook-inter",
    });
  }

  return NextResponse.json({ ok: true });
}
