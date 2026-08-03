/**
 * Próxima ação permitida na jornada do pedido (estudo 32 — cadeia feliz).
 * Fonte única para CTA da UI e allowedActions da API.
 */

import type { PedidoVendaStatus } from "@prisma/client";

export type JornadaActionId =
  | "liberar_credito"
  | "baixar_sinal"
  | "confirmar"
  | "reavaliar_materiais"
  | "iniciar_producao"
  | "concluir_producao"
  | "faturar"
  | "entregar"
  | "receber"
  | "cancelar";

export type JornadaNextAction = {
  id: JornadaActionId;
  label: string;
  /** main = POST /api/pedidos/:id · ops = /operacoes · os = /ordens-servico · op = /ordens-producao */
  channel: "main" | "ops" | "os" | "op";
  hint?: string;
};

export type JornadaContext = {
  status: PedidoVendaStatus | string;
  creditoFlag?: string | null;
  ordensServico: Array<{
    id: string;
    status: string;
    necessidades: Array<{ status: string }>;
  }>;
  ordensProducao?: Array<{
    id: string;
    status: string;
  }>;
  necessidadesCompra: Array<{ status: string }>;
  docsSaidaAutorizados: boolean;
  entrega: boolean;
  tituloAberto: boolean;
  tituloSinalAberto: boolean;
};

function faltaMaterial(ctx: JornadaContext): boolean {
  const os = ctx.ordensServico[0];
  if (!os) return false;
  if (os.status === "AGUARDANDO_MATERIAL") return true;
  if (os.necessidades.some((n) => n.status === "FALTA" || n.status === "PARCIAL")) return true;
  return ctx.necessidadesCompra.some((n) => n.status === "ABERTA" || n.status === "EM_COMPRA");
}

function todasOsConcluidas(ctx: JornadaContext): boolean {
  return (
    ctx.ordensServico.length > 0 &&
    ctx.ordensServico.every((o) => o.status === "CONCLUIDA")
  );
}

function opAtiva(ctx: JornadaContext) {
  return (ctx.ordensProducao || []).find((o) =>
    ["PLANEJADA", "EMPENHADA", "EM_SETUP", "EM_PRODUCAO", "PAUSADA", "AGUARDA_INSUMO"].includes(
      o.status,
    ),
  );
}

/**
 * Resolve UMA ação primária — a próxima do fluxo feliz.
 * Retorna null quando jornada encerrada ou cancelada.
 */
export function resolveNextAction(ctx: JornadaContext): JornadaNextAction | null {
  const st = ctx.status;

  if (st === "CANCELADO" || st === "LIQUIDADO") return null;

  if (st === "AGUARDA_CREDITO") {
    return {
      id: "liberar_credito",
      label: "Liberar crédito (financeiro)",
      channel: "ops",
      hint: "Alçada financeira — Motivo obrigatório. Depois o pedido fica LIBERADO ou aguarda sinal.",
    };
  }

  if (st === "AGUARDA_ADIANTAMENTO") {
    if (ctx.tituloSinalAberto) {
      return {
        id: "baixar_sinal",
        label: "Baixar sinal / adiantamento",
        channel: "ops",
        hint: "Após a baixa do sinal o pedido passa a LIBERADO e pode ser confirmado.",
      };
    }
    return {
      id: "baixar_sinal",
      label: "Baixar sinal / adiantamento",
      channel: "ops",
      hint: "Título de adiantamento não encontrado — verifique o financeiro.",
    };
  }

  if (st === "LIBERADO" || st === "RASCUNHO") {
    return {
      id: "confirmar",
      label: "Confirmar pedido · gerar OS + OP",
      channel: "main",
      hint: "Explode materiais, cria ordem de serviço e ordem de produção.",
    };
  }

  if (["CONFIRMADO", "EM_PRODUCAO", "PRODUZIDO"].includes(st)) {
    const os = ctx.ordensServico[0];
    const op = opAtiva(ctx);

    // Material gate: só bloqueia ação de produção quando OS aguarda material
    if (os?.status === "AGUARDANDO_MATERIAL" || (faltaMaterial(ctx) && !os)) {
      return {
        id: "reavaliar_materiais",
        label: "Reavaliar materiais / estoque",
        channel: "main",
        hint: "Há faltas — compre e lance a entrada, depois reavalie as reservas.",
      };
    }

    if (os?.status === "LIBERADA" || op?.status === "PLANEJADA" || op?.status === "EMPENHADA") {
      return {
        id: "iniciar_producao",
        label: "Iniciar produção",
        channel: op ? "op" : "os",
        hint: op ? `OP pronta` : `OS liberada`,
      };
    }

    if (
      os?.status === "EM_PRODUCAO" ||
      op?.status === "EM_PRODUCAO" ||
      op?.status === "PAUSADA" ||
      op?.status === "EM_SETUP"
    ) {
      return {
        id: "concluir_producao",
        label: "Concluir produção",
        channel: op ? "op" : "os",
        hint: "Baixa MP, registra sobra/retalho e libera PA.",
      };
    }

    if (todasOsConcluidas(ctx) || st === "PRODUZIDO") {
      if (!ctx.docsSaidaAutorizados) {
        return {
          id: "faturar",
          label: "Faturar — NF-e produção + boleto",
          channel: "ops",
          hint: "Emite NF-e de produção própria (PA-ETQ, CFOP 5101/6101), títulos e boleto.",
        };
      }
    }
  }

  if (st === "FATURADO" && !ctx.entrega) {
    return {
      id: "entregar",
      label: "Registrar entrega",
      channel: "ops",
    };
  }

  if ((st === "ENTREGUE" || ctx.entrega) && ctx.tituloAberto) {
    return {
      id: "receber",
      label: "Baixar recebimento",
      channel: "ops",
    };
  }

  if (st === "FATURADO" && ctx.entrega && ctx.tituloAberto) {
    return {
      id: "receber",
      label: "Baixar recebimento",
      channel: "ops",
    };
  }

  return null;
}

export function resolveOsOpIds(ctx: JornadaContext): { osId: string | null; opId: string | null } {
  const os = ctx.ordensServico[0] ?? null;
  const op = opAtiva(ctx) ?? (ctx.ordensProducao || [])[0] ?? null;
  return { osId: os?.id ?? null, opId: op?.id ?? null };
}
