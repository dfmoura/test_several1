export type Nec = {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  status: string;
  statusLabel?: string;
  produtoCodigo: string | null;
  pedidoVendaId?: string | null;
  pedidoNumero?: number | null;
  pedidoCliente?: string | null;
  pedidoCompraId?: string | null;
  pedidoCompraNumero?: number | null;
};

export type PcItem = {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  produtoCodigo: string | null;
  valorTotal: number;
};

export type PedidoCompra = {
  id: string;
  numero: number;
  status: string;
  statusLabel: string;
  fornecedorNome: string | null;
  observacoes: string | null;
  enviadoEm: string | null;
  recebidoEm: string | null;
  createdAt: string;
  qtdItens: number;
  pedidosOrigem: Array<{ numero: number; clienteNome: string }>;
  itens: PcItem[];
  docsEntrada: Array<{
    id: string;
    numero: string | null;
    status: string;
    statusLabel: string;
    valorTotal: number | null;
    emitenteNome: string | null;
  }>;
};

export type EntradaItem = {
  id: string;
  numeroItem: number;
  codigoXml: string | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valorUnitario: number;
  valorTotal: number;
  ncm: string | null;
  cfop: string | null;
  status: string;
  statusLabel: string;
  produtoId: string | null;
  produtoCodigo: string | null;
  produtoDescricao: string | null;
  codigoSugerido: string;
};

export type Entrada = {
  id: string;
  chave: string | null;
  numero: string | null;
  serie: string | null;
  emitenteNome: string | null;
  emitenteCnpj: string | null;
  valorTotal: number | null;
  status: string;
  statusLabel: string;
  pendentesMatch: number;
  podeLancar: boolean;
  pedidoCompraId: string | null;
  pedidoCompraNumero: number | null;
  itens: EntradaItem[];
};

export type Kpi = {
  necessidadesAbertas: number;
  necessidadesEmCompra: number;
  pedidosAbertos: number;
  entradasPendentes: number;
  entradasLancadas?: number;
  entradasTotal?: number;
};

export type ProdutoOpt = { id: string; codigo: string; descricao: string };
export type PapelOpt = { id: string; nome: string };
export type CadastroDraft = {
  codigo: string;
  descricao: string;
  unidade: string;
  ncm: string;
  papelId: string;
};
export type ResolveMode = "idle" | "cadastrar" | "vincular";
export type TabId = "necessidades" | "pedidos" | "entradas";

export function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtQtde(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export function fmtWhen(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function docStatusChip(status: string) {
  switch (status) {
    case "CONFERIDO":
      return "chip chip-entrada-conferido";
    case "ESTOQUE_LANCADO":
      return "chip chip-entrada-lancado";
    case "DIVERGENTE":
      return "chip chip-entrada-divergente";
    case "VALIDANDO":
      return "chip chip-entrada-validando";
    default:
      return "chip";
  }
}

export function pcStatusChip(status: string) {
  switch (status) {
    case "RASCUNHO":
      return "chip chip-pc-rascunho";
    case "ENVIADO":
      return "chip chip-pc-enviado";
    case "PARCIAL":
      return "chip chip-pc-parcial";
    case "RECEBIDO":
      return "chip chip-pc-recebido";
    case "CANCELADO":
      return "chip chip-pc-cancelado";
    default:
      return "chip";
  }
}

export function itemStatusChip(status: string) {
  switch (status) {
    case "PENDENTE_MATCH":
      return "chip chip-item-pendente";
    case "MATCHED":
      return "chip chip-item-matched";
    case "DIVERGENTE":
      return "chip chip-item-divergente";
    default:
      return "chip";
  }
}

export function necStatusChip(status: string) {
  if (status === "ABERTA") return "chip chip-nec-aberta";
  if (status === "EM_COMPRA") return "chip chip-nec-compra";
  return "chip";
}
