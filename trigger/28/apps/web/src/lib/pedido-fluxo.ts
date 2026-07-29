/** Monta a jornada visual do pedido (etapas + timeline + docs + financeiro). */

import type { PedidoVendaStatus } from "@prisma/client";

export type FluxoEtapaId =
  | "pedido"
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
  valorTotal: number;
  ordensServico: Array<{
    numero: number;
    status: string;
    iniciadoEm: string | null;
    concluidoEm: string | null;
    necessidades: Array<{ status: string }>;
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
    cobranca: {
      status: string;
      simulado: boolean;
      linhaDigitavel: string | null;
      nossoNumero: string | null;
    } | null;
  } | null;
  entrega: { dataEntrega: string; modalidade: string | null } | null;
};

const ORDER: PedidoVendaStatus[] = [
  "RASCUNHO",
  "CONFIRMADO",
  "EM_PRODUCAO",
  "FATURADO",
  "ENTREGUE",
  "LIQUIDADO",
];

function rank(status: string): number {
  if (status === "CANCELADO") return -1;
  const i = ORDER.indexOf(status as PedidoVendaStatus);
  return i < 0 ? 0 : i;
}

export function buildPedidoFluxo(p: Input): {
  etapas: FluxoEtapa[];
  timeline: TimelineEvent[];
  movimentos: MovimentoFinanceiroVisual[];
} {
  const r = rank(p.status);
  const os = p.ordensServico[0];
  const matsOk =
    !!os &&
    os.necessidades.length > 0 &&
    os.necessidades.every((n) => n.status === "OK" || n.status === "ATENDIDA");
  const comprasAbertas = p.necessidadesCompra.some(
    (n) => n.status === "ABERTA" || n.status === "EM_COMPRA",
  );
  const osConcluida = os?.status === "CONCLUIDA";
  const osEmProd = os?.status === "EM_PRODUCAO";
  const fiscalOk = p.docsSaida.some((d) => d.status === "AUTORIZADO");
  const docNfse = p.docsSaida.find((d) => d.tipo === "NFSE");
  const docNfe = p.docsSaida.find((d) => d.tipo === "NFE");
  const docFiscal = docNfse || docNfe || p.docsSaida[0];
  const boletoOk = !!p.tituloReceber?.cobranca && p.tituloReceber.cobranca.status !== "ERRO";
  const entregue = !!p.entrega || r >= rank("ENTREGUE");
  const liquidado = p.tituloReceber?.status === "PAGO" || r >= rank("LIQUIDADO");

  function state(
    done: boolean,
    current: boolean,
    blocked = false,
  ): FluxoEtapaState {
    if (blocked && !done) return "blocked";
    if (done) return "done";
    if (current) return "current";
    return "pending";
  }

  const etapas: FluxoEtapa[] = [
    {
      id: "pedido",
      label: "Pedido + OS",
      detail: os
        ? `Pedido confirmado · OS ${os.numero}`
        : r >= 1
          ? "Confirmado"
          : "Aguardando confirmação",
      state: state(r >= 1, p.status === "RASCUNHO" || (r >= 1 && !matsOk && !osEmProd && !osConcluida)),
      at: p.confirmadoEm || (r >= 1 ? p.createdAt : null),
    },
    {
      id: "materiais",
      label: "Materiais",
      detail: matsOk
        ? "Reservas ok"
        : comprasAbertas
          ? "Aguardando compra / entrada NFe"
          : os
            ? "Verificando estoque"
            : "—",
      state: state(
        matsOk || osEmProd || osConcluida || r >= 2,
        !!os && !matsOk && !osConcluida && r >= 1,
        r < 1,
      ),
      at: matsOk || osEmProd || osConcluida ? p.confirmadoEm : null,
    },
    {
      id: "producao",
      label: "Produção",
      detail: osConcluida
        ? "OS concluída"
        : osEmProd
          ? "Em execução"
          : os?.status === "LIBERADA"
            ? "Liberada — pronta para iniciar"
            : "Aguardando liberação",
      state: state(
        osConcluida || r >= 3,
        osEmProd || os?.status === "LIBERADA",
        !matsOk && !osEmProd && !osConcluida,
      ),
      at: os?.concluidoEm || os?.iniciadoEm || null,
    },
    {
      id: "fiscal",
      label: "Notas fiscais",
      detail: fiscalOk
        ? [
            docNfse ? `NFS-e ${docNfse.numero ?? ""}` : null,
            docNfe ? `NF-e ${docNfe.numero ?? ""}` : null,
          ]
            .filter(Boolean)
            .join(" · ") + " autorizada(s)"
        : osConcluida
          ? "Pronto para faturar"
          : "Após produção",
      state: state(!!fiscalOk, osConcluida && !fiscalOk && r < 4, !osConcluida),
      at: docFiscal?.autorizadoEm || p.faturadoEm,
    },
    {
      id: "cobranca",
      label: "Boleto",
      detail: boletoOk
        ? `Bolepix ${p.tituloReceber?.cobranca?.simulado ? "(simulado)" : "Inter"}`
        : fiscalOk
          ? "Gerando cobrança"
          : "Após faturamento",
      state: state(!!boletoOk, !!fiscalOk && !boletoOk, !fiscalOk),
      at: p.faturadoEm,
    },
    {
      id: "entrega",
      label: "Entrega",
      detail: entregue
        ? p.entrega?.modalidade || "Registrada"
        : fiscalOk
          ? "Aguardando expedição"
          : "—",
      state: state(entregue, !!fiscalOk && !entregue, !fiscalOk),
      at: p.entregueEm || p.entrega?.dataEntrega || null,
    },
    {
      id: "financeiro",
      label: "Recebimento",
      detail: liquidado
        ? "Título liquidado"
        : boletoOk
          ? "Aberto a receber"
          : "—",
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
  if (p.confirmadoEm) {
    timeline.push({
      id: "confirm",
      at: p.confirmadoEm,
      title: "Pedido confirmado + OS gerada",
      detail: os ? `OS ${os.numero} · explosão de materiais` : "OS gerada",
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
  if (os?.iniciadoEm) {
    timeline.push({
      id: "os-ini",
      at: os.iniciadoEm,
      title: `Produção iniciada (OS ${os.numero})`,
      detail: "Ordem de serviço em execução",
      kind: "os",
    });
  }
  if (os?.concluidoEm) {
    timeline.push({
      id: "os-fim",
      at: os.concluidoEm,
      title: `Produção concluída (OS ${os.numero})`,
      detail: "Baixa de insumos no estoque",
      kind: "os",
    });
  }
  if (p.docsSaida.length && (p.faturadoEm || p.docsSaida.some((d) => d.autorizadoEm))) {
    for (const d of p.docsSaida) {
      timeline.push({
        id: `doc-${d.tipo}`,
        at: d.autorizadoEm || p.faturadoEm!,
        title: `${d.tipo === "NFE" ? "NF-e" : "NFS-e"} ${d.numero || ""} autorizada`,
        detail: d.simulado ? "Emissão simulada (homologação)" : "Focus NFe",
        kind: "fiscal",
      });
    }
  }
  if (p.tituloReceber && p.faturadoEm) {
    timeline.push({
      id: "boleto",
      at: p.faturadoEm,
      title: "Boleto / Pix gerado",
      detail: p.tituloReceber.cobranca?.nossoNumero
        ? `Nosso número ${p.tituloReceber.cobranca.nossoNumero}`
        : "Cobrança Inter",
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
  if (p.tituloReceber && p.faturadoEm) {
    movimentos.push({
      id: "tit",
      at: p.faturadoEm,
      tipo: "EMITIR_TITULO",
      descricao: "Título a receber (pedido faturado)",
      valor: p.tituloReceber.valor,
      sinal: "+",
      status: p.tituloReceber.status,
    });
    if (p.tituloReceber.cobranca) {
      movimentos.push({
        id: "bol",
        at: p.faturadoEm,
        tipo: "EMITIR_BOLETO",
        descricao: `Bolepix Inter${p.tituloReceber.cobranca.simulado ? " · simulado" : ""}`,
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
