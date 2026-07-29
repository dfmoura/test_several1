/** Tipos e helpers comerciais compartilhados (UI + PDF + API). */

export type OrcamentoInputSnapshot = {
  clienteNome?: string;
  vendedorNome?: string;
  observacoes?: string | null;
  medida?: string;
  larguraPapel?: number;
  puxada?: number;
  cores?: number | string;
  papel?: string;
  acabamento?: string;
  qtdeModelos?: number;
  qtdeColunas?: number;
  etiqPorRolo?: number;
  tubete?: string;
  z?: number | null;
  formatoFaca?: string;
  maquinaRoda?: string;
  maquinaGrupo?: string;
  impostoPct?: number;
  matriz?: boolean;
  colunaRebobinacao?: number;
  rpm?: number;
  comissaoPct?: number;
  faixas?: Array<{ quantidade: number; tipoParada: string }>;
  clienteParceiroId?: string | null;
  vendedorParceiroId?: string | null;
};

export type OrcamentoResultSnapshot = {
  valorMatrizBruto?: number;
  alerts?: string[];
  faixas?: Array<{
    production: {
      quantidade: number;
      qtdeRolos: number;
      metragemLinear?: number;
      metragemM2?: number;
      horaMaquina?: number;
      qtdeCaixas?: number;
    };
    costs: {
      valorServico: number;
      valorPapel?: number;
      valorMaquina?: number;
      valorTrocaProduto?: number;
      valorTrocaBobina?: number;
      tinta?: number;
      acabamento?: number;
      rebobinacao?: number;
      tubete?: number;
      valorCaixa?: number;
    };
    commercial: {
      valorEtiqueta: number;
      valorMatriz: number;
      valorTotal: number;
      comissao?: number;
      imposto?: number;
      servicoEncargos?: number;
    };
  }>;
};

export type ComercialParams = {
  prazoEntrega: string;
  validade: string;
  clausulaQuantidade: string;
};

export const DEFAULT_COMERCIAL: ComercialParams = {
  prazoEntrega: "12 dias úteis",
  validade: "7 dias",
  clausulaQuantidade: "As quantidades podem variar ±20%",
};

export function descricaoProduto(input: OrcamentoInputSnapshot): string {
  const parts = [
    input.papel,
    input.medida,
    input.acabamento,
    input.etiqPorRolo != null ? `${input.etiqPorRolo} etiq/rolo` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function formatBrl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatQtde(n: number): string {
  return n.toLocaleString("pt-BR");
}
