import { NextRequest, NextResponse } from "next/server";
import { DocSaidaStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Webhook Focus NFe (autorização). Em homologação aceita payload simples. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ref = String(body.ref || body.referencia || "");
  const status = String(body.status || body.situacao || "").toLowerCase();

  if (!ref) return NextResponse.json({ ok: true, ignored: true });

  const doc = await prisma.documentoFiscalSaida.findFirst({ where: { refFocus: ref } });
  if (!doc) return NextResponse.json({ ok: true, notFound: true });

  const autorizado =
    status.includes("autoriz") || status === "autorizado" || body.cStat === "100";

  if (autorizado) {
    await prisma.documentoFiscalSaida.update({
      where: { id: doc.id },
      data: {
        status: DocSaidaStatus.AUTORIZADO,
        autorizadoEm: new Date(),
        chave: body.chave || body.numero_nfse || doc.chave,
        numero: body.numero || doc.numero,
        xmlBruto: body.xml || doc.xmlBruto,
      },
    });
  } else if (status.includes("erro") || status.includes("rejeit")) {
    await prisma.documentoFiscalSaida.update({
      where: { id: doc.id },
      data: {
        status: DocSaidaStatus.ERRO,
        mensagemErro: body.mensagem || body.mensagem_sefaz || "Erro na autorização",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
