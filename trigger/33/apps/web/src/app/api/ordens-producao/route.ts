import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { requireEmpresaRaiz } from "@/lib/empresa";
import {
  apontarOp,
  concluirOp,
  iniciarOp,
  listarFilaPcp,
} from "@/lib/ordem-producao";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empresa = await requireEmpresaRaiz();
  const items = await listarFilaPcp({ empresaId: empresa.id });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    requireRole(session, ["ADMIN", "PCP", "VENDEDOR"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const opId = String(body.opId || "");

  if (!opId) {
    return NextResponse.json({ error: "opId obrigatório" }, { status: 400 });
  }

  try {
    if (action === "iniciar") {
      const op = await iniciarOp({ opId, userId: session.id });
      return NextResponse.json({ id: op.id, status: op.status });
    }
    if (action === "apontar") {
      const op = await apontarOp({
        opId,
        userId: session.id,
        qtdBoa: body.qtdBoa != null ? Number(body.qtdBoa) : undefined,
        qtdRefugo: body.qtdRefugo != null ? Number(body.qtdRefugo) : undefined,
        sobraMetros: body.sobraMetros !== undefined ? body.sobraMetros : undefined,
        pausar: Boolean(body.pausar),
        motivoPausa: body.motivoPausa ? String(body.motivoPausa) : null,
      });
      return NextResponse.json({ id: op.id, status: op.status });
    }
    if (action === "concluir") {
      const op = await concluirOp({
        opId,
        userId: session.id,
        qtdBoa: body.qtdBoa != null ? Number(body.qtdBoa) : undefined,
        qtdRefugo: body.qtdRefugo != null ? Number(body.qtdRefugo) : undefined,
        sobraMetros: body.sobraMetros !== undefined ? body.sobraMetros : undefined,
      });
      return NextResponse.json({ id: op.id, status: op.status });
    }
    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro" },
      { status },
    );
  }
}
