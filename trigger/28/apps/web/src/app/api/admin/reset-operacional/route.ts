import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import { resetOperacional } from "@/lib/reset-operacional";

/** ADMIN only — limpa ciclo operacional e mantém cadastros mestres. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  try {
    requireRole(session, ["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const result = await resetOperacional(session.id);
    return NextResponse.json({
      ok: true,
      message: "Dados operacionais apagados. Cadastros mestres preservados.",
      ...result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no reset" },
      { status: 500 },
    );
  }
}
