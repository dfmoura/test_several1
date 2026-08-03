/**
 * Jornada visual do pedido alinhada ao estudo 32 (INDICE_FLUXO_OPERACIONAL).
 *
 * ORC (origem) → crédito/sinal → confirmar → materiais → produção → NF+TIT → ENT → BX
 */

import type { PedidoVendaStatus } from "@prisma/client";

export type FluxoEtapaId =
  | "credito"
  | "confirmar"
  | "materiais"
  | "producao"
  | "fiscal"
  | "cobranca"
  | "entrega"
  | "financeiro";

export type FluxoEtapaState = "done" | "current" | "pending" | "blocked";

export type FluxoEtapa = {
  id: FluxoEtapaId;
  label: string;
  detail: string;
  state: FluxoEtapaState;
  at: string | null;
};

export type TimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail: string;
  kind: "pedido" | "os" | "compra" | "fiscal" | "financeiro" | "entrega";
};

export type MovimentoFinanceiroVisual = {
  id: string;
  at: string;
  tipo: "EMITIR_TITULO" | "EMITIR_BOLETO" | "RECEBIMENTO" | "ESTORNO";
  descricao: string;
  valor: number;
  sinal: "+" | "-" | "±";
  status: string;
};

type Input = {
  status: PedidoVendaStatus | string;
  createdAt: string;
  confirmadoEm: string | null;
  faturadoEm: string | null;
  entregueEm: string | null;
  liquidadoEm: string | null;
  liberadoCreditoEm?: string | null;
  valorTotal: number;
  creditoFlag?: string | null;
  ordensServico: Array<{
    numero: number;
    status: string;
    iniciadoEm: string | null;
    concluidoEm: string | null;
    necessidades: Array<{ status: string }>;
  }>;
  ordensProducao?: Array<{
    numero: number;
    status: string;
    iniciadoEm: string | null;
    concluidoEm: string | null;
  }>;
  necessidadesCompra: Array<{ status: string; descricao: string }>;
  docsSaida: Array<{
    tipo: string;
    status: string;
    numero: string | null;
    autorizadoEm: string | null;
    simulado: boolean;
    valorTotal: number;
  }>;
  docsEntrada: Array<{
    id: string;
    numero: string | null;
    status: string;
    valorTotal: number | null;
    lancadoEm: string | null;
    emitenteNome: string | null;
  }>;
  tituloReceber: {
    status: string;
    valor: number;
    vencimento: string;
    isAdiantamento?: boolean;
    cobranca: {
      status: string;
      simulado: boolean;
      linhaDigitavel: string | null;
      nossoNumero: string | null;
    } | null;
  } | null;
  entrega: { dataEntrega: string; modalidade: string | null } | null;
};

const RANK: Record<string, number> = {
  RASCUNHO: 1,
  AGUARDA_CREDITO: 0,
  AGUARDA_ADIANTAMENTO: 0,
  LIBERADO: 1,
  CONFIRMADO: 2,
  EM_PRODUCAO: 3,
  PRODUZIDO: 4,
  FATURADO: 5,
  ENTREGUE: 6,
  LIQUIDADO: 7,
  CANCELADO: -1,
};

function rank(status: string): number {
  return RANK[status] ?? 0;
}

function state(done: boolean, current: boolean, blocked = false): FluxoEtapaState {
  if (blocked && !done) return "blocked";
  if (done) return "done";
  if (current) return "current";
  return "pending";
}

export function buildPedidoFluxo(p: Input): {
  etapas: FluxoEtapa[];
  timeline: TimelineEvent[];
  movimentos: MovimentoFinanceiroVisual[];
} {
  const r = rank(p.status);
  const os = p.ordensServico[0];
  const op = p.ordensProducao?.[0];
  const matsOk =
    !!os &&
    os.necessidades.length > 0 &&
    os.necessidades.every((n) => n.status === "OK" || n.status === "ATENDIDA");
  const comprasAbertas = p.necessidadesCompra.some(
    (n) => n.status === "ABERTA" || n.status === "EM_COMPRA",
  );
  const osConcluida = os?.status === "CONCLUIDA" || op?.status === "CONCLUIDA";
  const osEmProd =
    os?.status === "EM_PRODUCAO" ||
    ["EM_PRODUCAO", "EM_SETUP", "PAUSADA"].includes(op?.status || "");
  const fiscalOk = p.docsSaida.some((d) => d.status === "AUTORIZADO");
  const docNfse = p.docsSaida.find((d) => d.tipo === "NFSE");
  const docNfe = p.docsSaida.find((d) => d.tipo === "NFE");
  const docFiscal = docNfse || docNfe || p.docsSaida[0];
  const boletoOk = !!p.tituloReceber?.cobranca && p.tituloReceber.cobranca.status !== "ERRO";
  const entregue = !!p.entrega || r >= rank("ENTREGUE");
  const liquidado = p.tituloReceber?.status === "PAGO" || r >= rank("LIQUIDADO");
  const creditoOk = !["AGUARDA_CREDITO", "AGUARDA_ADIANTAMENTO"].includes(p.status);
  const confirmado = r >= rank("CONFIRMADO");

  const etapas: FluxoEtapa[] = [
    {
      id: "credito",
      label: "Crédito",
      detail:
        p.status === "AGUARDA_CREDITO"
          ? "Bloqueado — liberar financeiro"
          : p.status === "AGUARDA_ADIANTAMENTO"
            ? "Aguarda baixa do sinal"
            : creditoOk
              ? "OK / liberado"
              : "—",
      state: state(
        creditoOk && r >= 1,
        p.status === "AGUARDA_CREDITO" || p.status === "AGUARDA_ADIANTAMENTO",
      ),
      at: p.liberadoCreditoEm || (creditoOk ? p.createdAt : null),
    },
    {
      id: "confirmar",
      label: "Confirmar",
      detail: confirmado
        ? os
          ? `OS ${os.numero}${op ? ` · OP ${op.numero}` : ""}`
          : "Confirmado"
        : p.status === "LIBERADO" || p.status === "RASCUNHO"
          ? "Gerar OS + OP"
          : "Aguardando crédito",
      state: state(
        confirmado,
        (p.status === "LIBERADO" || p.status === "RASCUNHO") && !confirmado,
        !creditoOk,
      ),
      at: p.confirmadoEm,
    },
    {
      id: "materiais",
      label: "Materiais",
      detail: matsOk
        ? "Reservas ok"
        : comprasAbertas
          ? "OC urgente (OP parada)"
          : os
            ? "Reservar estoque"
            : "—",
      state: state(
        matsOk || osEmProd || osConcluida || r >= 3,
        confirmado && !matsOk && !osConcluida,
        !confirmado,
      ),
      at: matsOk || osEmProd || osConcluida ? p.confirmadoEm : null,
    },
    {
      id: "producao",
      label: "Produção",
      detail: osConcluida
        ? "Concluída"
        : osEmProd
          ? "Em execução"
          : os?.status === "LIBERADA" || op?.status === "PLANEJADA"
            ? "Pronta para iniciar"
            : "—",
      state: state(
        osConcluida || r >= 4,
        osEmProd ||
          os?.status === "LIBERADA" ||
          ["PLANEJADA", "EMPENHADA"].includes(op?.status || ""),
        (!matsOk && !osEmProd && !osConcluida) || !confirmado,
      ),
      at: os?.concluidoEm || op?.concluidoEm || os?.iniciadoEm || op?.iniciadoEm || null,
    },
    {
      id: "fiscal",
      label: "Notas",
      detail: fiscalOk
        ? [docNfse ? `NFS-e ${docNfse.numero ?? ""}` : null, docNfe ? `NF-e ${docNfe.numero ?? ""}` : null]
            .filter(Boolean)
            .join(" · ")
        : osConcluida || r >= 4
          ? "Pronto para faturar"
          : "Após produção",
      state: state(!!fiscalOk, (osConcluida || r >= 4) && !fiscalOk, !(osConcluida || r >= 4)),
      at: docFiscal?.autorizadoEm || p.faturadoEm,
    },
    {
      id: "cobranca",
      label: "Cobrança",
      detail: boletoOk
        ? `Bolepix ${p.tituloReceber?.cobranca?.simulado ? "(HML)" : ""}`
        : fiscalOk
          ? "Gerando"
          : "Após NF",
      state: state(!!boletoOk, !!fiscalOk && !boletoOk, !fiscalOk),
      at: p.faturadoEm,
    },
    {
      id: "entrega",
      label: "Entrega",
      detail: entregue ? p.entrega?.modalidade || "Registrada" : fiscalOk ? "Expedir" : "—",
      state: state(entregue, !!fiscalOk && !entregue, !fiscalOk),
      at: p.entregueEm || p.entrega?.dataEntrega || null,
    },
    {
      id: "financeiro",
      label: "Baixa",
      detail: liquidado ? "Liquidado" : boletoOk ? "A receber" : "—",
      state: state(liquidado, !!boletoOk && !liquidado, !boletoOk),
      at: p.liquidadoEm,
    },
  ];

  const timeline: TimelineEvent[] = [];
  timeline.push({
    id: "created",
    at: p.createdAt,
    title: "Pedido criado",
    detail: "Convertido do orçamento aprovado",
    kind: "pedido",
  });
  if (p.liberadoCreditoEm) {
    timeline.push({
      id: "credito",
      at: p.liberadoCreditoEm,
      title: "Crédito / sinal liberado",
      detail: p.creditoFlag || "OK",
      kind: "financeiro",
    });
  }
  if (p.confirmadoEm) {
    timeline.push({
      id: "confirm",
      at: p.confirmadoEm,
      title: "Pedido confirmado · OS + OP",
      detail: os ? `OS ${os.numero}` : "Explosão de materiais",
      kind: "os",
    });
  }
  for (const d of p.docsEntrada) {
    if (d.lancadoEm) {
      timeline.push({
        id: `ent-${d.id}`,
        at: d.lancadoEm,
        title: `NFe entrada ${d.numero || ""}`.trim(),
        detail: `${d.emitenteNome || "Fornecedor"} · estoque lançado`,
        kind: "compra",
      });
    }
  }
  if (os?.iniciadoEm || op?.iniciadoEm) {
    timeline.push({
      id: "prod-ini",
      at: (os?.iniciadoEm || op?.iniciadoEm)!,
      title: "Produção iniciada",
      detail: [os ? `OS ${os.numero}` : null, op ? `OP ${op.numero}` : null]
        .filter(Boolean)
        .join(" · "),
      kind: "os",
    });
  }
  if (os?.concluidoEm || op?.concluidoEm) {
    timeline.push({
      id: "prod-fim",
      at: (os?.concluidoEm || op?.concluidoEm)!,
      title: "Produção concluída",
      detail: "MP baixada · PA / sobra",
      kind: "os",
    });
  }
  if (p.docsSaida.length && (p.faturadoEm || p.docsSaida.some((d) => d.autorizadoEm))) {
    for (const d of p.docsSaida) {
      timeline.push({
        id: `doc-${d.tipo}`,
        at: d.autorizadoEm || p.faturadoEm!,
        title: `${d.tipo === "NFE" ? "NF-e" : "NFS-e"} ${d.numero || ""} autorizada`,
        detail: d.simulado ? "Simulado (homologação)" : "Focus NFe",
        kind: "fiscal",
      });
    }
  }
  if (p.tituloReceber && p.faturadoEm) {
    timeline.push({
      id: "boleto",
      at: p.faturadoEm,
      title: "Cobrança gerada",
      detail: p.tituloReceber.cobranca?.nossoNumero
        ? `Nosso número ${p.tituloReceber.cobranca.nossoNumero}`
        : "Título + Bolepix",
      kind: "financeiro",
    });
  }
  if (p.entrega) {
    timeline.push({
      id: "entrega",
      at: p.entrega.dataEntrega,
      title: "Entrega registrada",
      detail: p.entrega.modalidade || "Cliente",
      kind: "entrega",
    });
  }
  if (p.liquidadoEm) {
    timeline.push({
      id: "liq",
      at: p.liquidadoEm,
      title: "Recebimento baixado",
      detail: "Título liquidado",
      kind: "financeiro",
    });
  }
  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const movimentos: MovimentoFinanceiroVisual[] = [];
  if (p.tituloReceber && (p.faturadoEm || p.tituloReceber.isAdiantamento)) {
    movimentos.push({
      id: "tit",
      at: p.faturadoEm || p.createdAt,
      tipo: "EMITIR_TITULO",
      descricao: p.tituloReceber.isAdiantamento
        ? "Título de sinal / adiantamento"
        : "Título a receber",
      valor: p.tituloReceber.valor,
      sinal: "+",
      status: p.tituloReceber.status,
    });
    if (p.tituloReceber.cobranca) {
      movimentos.push({
        id: "bol",
        at: p.faturadoEm || p.createdAt,
        tipo: "EMITIR_BOLETO",
        descricao: `Bolepix${p.tituloReceber.cobranca.simulado ? " · simulado" : ""}`,
        valor: p.tituloReceber.valor,
        sinal: "±",
        status: p.tituloReceber.cobranca.status,
      });
    }
    if (p.tituloReceber.status === "PAGO" && p.liquidadoEm) {
      movimentos.push({
        id: "rec",
        at: p.liquidadoEm,
        tipo: "RECEBIMENTO",
        descricao: "Baixa de recebimento",
        valor: p.tituloReceber.valor,
        sinal: "+",
        status: "PAGO",
      });
    }
  }

  return { etapas, timeline, movimentos };
}
