/**
 * Split comercial → NF-e (revenda de mercadoria) + NFS-e (prestação de serviço).
 *
 * Regra de negócio da gráfica de etiquetas:
 * - NF-e  = revenda dos produtos / materiais incorporados (papel, acabamento, tubete, caixa)
 * - NFS-e = prestação do serviço de impressão / composição gráfica
 *
 * Os valores comerciais (com imposto e comissão) são rateados na mesma proporção
 * dos custos de origem do motor de preço — sem “puxadinho” de percentual fixo.
 */

export type CustosFaixa = {
  valorPapel?: number;
  valorMaquina?: number;
  valorTrocaProduto?: number;
  valorTrocaBobina?: number;
  tinta?: number;
  acabamento?: number;
  rebobinacao?: number;
  tubete?: number;
  valorCaixa?: number;
  valorServico?: number;
};

export type SplitDualResultado = {
  /** Valor da NF-e de revenda (mercadoria). */
  valorMercadoria: number;
  /** Valor da NFS-e de prestação de serviço. */
  valorServico: number;
  /** Matriz (quando cobrada no 1º pedido) — sempre NFS-e. */
  valorMatriz: number;
  /** Base de custo usada no rateio (antes de encargos). */
  custoMercadoria: number;
  custoServico: number;
  /** Fração mercadoria / (mercadoria + serviço), 0..1. */
  ratioMercadoria: number;
  resumo: string;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Separa custos físicos (mercadoria) dos custos de processamento (serviço).
 */
export function classificarCustos(costs: CustosFaixa | null | undefined): {
  custoMercadoria: number;
  custoServico: number;
} {
  if (!costs) {
    return { custoMercadoria: 0, custoServico: 0 };
  }
  const custoMercadoria = round2(
    n(costs.valorPapel) + n(costs.acabamento) + n(costs.tubete) + n(costs.valorCaixa),
  );
  const custoServico = round2(
    n(costs.valorMaquina) +
      n(costs.valorTrocaProduto) +
      n(costs.valorTrocaBobina) +
      n(costs.tinta) +
      n(costs.rebobinacao),
  );
  return { custoMercadoria, custoServico };
}

/**
 * Rateia o valor comercial da faixa entre NF-e e NFS-e.
 * `valorEtiqueta` = total da impressão (sem matriz).
 * `valorMatriz` fica à parte e entra só na NFS-e.
 */
export function splitDualFaturamento(opts: {
  valorEtiqueta: number;
  valorMatriz?: number;
  costs?: CustosFaixa | null;
}): SplitDualResultado {
  const valorEtiqueta = round2(Math.max(0, n(opts.valorEtiqueta)));
  const valorMatriz = round2(Math.max(0, n(opts.valorMatriz)));
  const { custoMercadoria, custoServico } = classificarCustos(opts.costs);
  const base = custoMercadoria + custoServico;

  let valorMercadoria: number;
  let valorServicoImpressao: number;

  if (base <= 0 || valorEtiqueta <= 0) {
    // Fallback conservador: 35% mercadoria / 65% serviço (comum em gráfica)
    valorMercadoria = round2(valorEtiqueta * 0.35);
    valorServicoImpressao = round2(valorEtiqueta - valorMercadoria);
  } else {
    const ratio = custoMercadoria / base;
    valorMercadoria = round2(valorEtiqueta * ratio);
    valorServicoImpressao = round2(valorEtiqueta - valorMercadoria);
  }

  // Garante pelo menos R$ 0,01 em cada documento quando o total permite
  if (valorEtiqueta >= 0.02) {
    if (valorMercadoria < 0.01) {
      valorMercadoria = 0.01;
      valorServicoImpressao = round2(valorEtiqueta - valorMercadoria);
    } else if (valorServicoImpressao < 0.01) {
      valorServicoImpressao = 0.01;
      valorMercadoria = round2(valorEtiqueta - valorServicoImpressao);
    }
  }

  const valorServico = round2(valorServicoImpressao + valorMatriz);
  const ratioMercadoria = valorEtiqueta > 0 ? valorMercadoria / valorEtiqueta : 0;

  const resumo =
    `NF-e revenda ${formatBrl(valorMercadoria)} + ` +
    `NFS-e serviço ${formatBrl(valorServico)}` +
    (valorMatriz > 0 ? ` (inclui matriz ${formatBrl(valorMatriz)})` : "");

  return {
    valorMercadoria,
    valorServico,
    valorMatriz,
    custoMercadoria,
    custoServico,
    ratioMercadoria,
    resumo,
  };
}

function formatBrl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
