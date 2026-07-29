export type TabId = "visao" | "receber" | "pagar" | "banco" | "fluxo";

export type HubRefs = {
  cobranca: string;
  extrato: string;
  saldo: string;
};

export type AgingBucket = {
  id: string;
  label: string;
  quantidade: number;
  valor: number;
};

export type FinanceiroDashboard = {
  hubs: HubRefs;
  conta: {
    id: string;
    apelido: string;
    bancoCodigo: string;
    bancoNome: string;
    simulado: boolean;
    saldo: {
      disponivel: number;
      bloqueado: number;
      limite: number;
      consultadoEm: string;
    };
  };
  kpi: {
    aReceber: number;
    aPagar: number;
    vencidoReceber: number;
    vencidoPagar: number;
    saldoDisponivel: number;
    posicaoLiquida: number;
    qtdReceber: number;
    qtdPagar: number;
    pendentesConciliacao: number;
  };
  agingReceber: AgingBucket[];
  agingPagar: AgingBucket[];
  fluxo: {
    saldoInicial: number;
    dias: Array<{
      data: string;
      entradas: number;
      saidas: number;
      liquido: number;
      acumulado: number;
    }>;
    totalEntradas: number;
    totalSaidas: number;
    saldoFinal: number;
  };
};

export type TituloReceberRow = {
  id: string;
  pedidoId: string;
  pedidoNumero: number;
  clienteNome: string;
  valor: number;
  valorPago: number;
  valorAberto: number;
  vencimento: string;
  status: string;
  diasAtraso: number;
  pagoEm: string | null;
  cobranca: {
    status: string;
    nossoNumero: string | null;
    simulado: boolean;
    temLinha: boolean;
    temPix: boolean;
  } | null;
};

export type TituloPagarRow = {
  id: string;
  pedidoCompraId: string | null;
  pedidoCompraNumero: number | null;
  fornecedorNome: string;
  fornecedorDoc: string | null;
  descricao: string;
  valor: number;
  valorPago: number;
  valorAberto: number;
  vencimento: string;
  status: string;
  diasAtraso: number;
  pagoEm: string | null;
};

export type MovimentoRow = {
  id: string;
  dataEntrada: string;
  tipoOperacao: "CREDITO" | "DEBITO";
  tipoTransacao: string;
  valor: number;
  titulo: string;
  descricao: string;
  origem: string;
  simulado: boolean;
  conciliado: boolean;
  conciliacaoStatus: string;
  tituloReceberId: string | null;
  tituloPagarId: string | null;
  matchLabel: string | null;
};

export type SugestaoConciliacao = {
  movimentoId: string;
  tituloReceberId?: string;
  tituloPagarId?: string;
  confianca: "alta" | "media";
  motivo: string;
};

export function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso.slice(0, 10);
  }
}

export function statusReceberLabel(s: string): string {
  const map: Record<string, string> = {
    ABERTO: "Em aberto",
    VENCIDO: "Vencido",
    PAGO: "Liquidado",
    CANCELADO: "Cancelado",
    PARCIAL: "Parcial",
  };
  return map[s] ?? s;
}

export function statusPagarLabel(s: string): string {
  return statusReceberLabel(s);
}

export function statusChipClass(s: string): string {
  if (s === "PAGO") return "chip chip-status-aprovado";
  if (s === "VENCIDO") return "chip chip-status-reprovado";
  if (s === "PARCIAL") return "chip chip-status-enviado";
  if (s === "CANCELADO") return "chip chip-soft";
  return "chip chip-status-rascunho";
}
