import { NextRequest, NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth";
import {
  baixarTituloPagar,
  conciliarMovimento,
  getFinanceiroDashboard,
  getFluxoCaixa,
  listarContasPagar,
  listarContasReceber,
  listarMovimentos,
  requireEmpresaFinanceiro,
  sugerirConciliacoes,
  sincronizarExtratoInter,
} from "@/lib/financeiro";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const empresa = await requireEmpresaFinanceiro();
  const tipo = req.nextUrl.searchParams.get("tipo") || "dashboard";
  const filtro = req.nextUrl.searchParams.get("filtro") || undefined;

  try {
    switch (tipo) {
      case "dashboard":
        return NextResponse.json(await getFinanceiroDashboard(empresa.id));
      case "receber":
        return NextResponse.json({
          items: await listarContasReceber(empresa.id, filtro),
        });
      case "pagar":
        return NextResponse.json({
          items: await listarContasPagar(empresa.id, filtro),
        });
      case "movimentos": {
        const soPendentes = req.nextUrl.searchParams.get("pendentes") === "1";
        return NextResponse.json({
          items: await listarMovimentos(empresa.id, { soPendentes }),
          sugestoes: await sugerirConciliacoes(empresa.id),
        });
      }
      case "fluxo": {
        const dias = Number(req.nextUrl.searchParams.get("dias") || "30");
        return NextResponse.json(await getFluxoCaixa(empresa.id, dias));
      }
      default:
        return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro financeiro";
    const status = (e as { status?: number }).status ?? 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "FINANCEIRO"]);
  } catch {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const empresa = await requireEmpresaFinanceiro();
  const body = (await req.json()) as Record<string, unknown>;
  const acao = String(body.acao || "");

  try {
    switch (acao) {
      case "sincronizar_extrato": {
        const dataFim = String(body.dataFim || new Date().toISOString().slice(0, 10));
        const dataInicio = String(
          body.dataInicio ||
            (() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              return d.toISOString().slice(0, 10);
            })(),
        );
        const result = await sincronizarExtratoInter({
          empresaId: empresa.id,
          dataInicio,
          dataFim,
          userId: session.id,
        });
        return NextResponse.json(result);
      }
      case "baixar_pagar": {
        const tituloId = String(body.tituloId || "");
        if (!tituloId) {
          return NextResponse.json({ error: "tituloId obrigatório" }, { status: 400 });
        }
        const t = await baixarTituloPagar({
          tituloId,
          userId: session.id,
          valorPago: body.valorPago != null ? Number(body.valorPago) : undefined,
          via: "financeiro-ui",
        });
        return NextResponse.json({ ok: true, titulo: t });
      }
      case "conciliar": {
        const movimentoId = String(body.movimentoId || "");
        if (!movimentoId) {
          return NextResponse.json({ error: "movimentoId obrigatório" }, { status: 400 });
        }
        const c = await conciliarMovimento({
          movimentoId,
          userId: session.id,
          tituloReceberId: body.tituloReceberId
            ? String(body.tituloReceberId)
            : undefined,
          tituloPagarId: body.tituloPagarId ? String(body.tituloPagarId) : undefined,
          ignorar: Boolean(body.ignorar),
        });
        return NextResponse.json({ ok: true, conciliacao: c });
      }
      default:
        return NextResponse.json({ error: "ação inválida" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro financeiro";
    const status = (e as { status?: number }).status ?? 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
