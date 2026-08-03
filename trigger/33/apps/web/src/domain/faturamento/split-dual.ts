/**
 * @deprecated Estudo 32: etiqueta sob encomenda NÃO usa dual NF-e+NFS-e.
 * Use família PA-ETQ + NF-e CFOP 5101/6101 (`domain/venda/familia-pa.ts`).
 * Mantido só para leitura de snapshots legados / testes históricos.
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
  valorMercadoria: number;
  valorServico: number;
  valorMatriz: number;
  custoMercadoria: number;
  custoServico: number;
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

/** @deprecated */
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

/** @deprecated Não usar no fluxo feliz — ver familia-pa + planejarDocumentosSaida. */
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
    valorMercadoria = round2(valorEtiqueta * 0.35);
    valorServicoImpressao = round2(valorEtiqueta - valorMercadoria);
  } else {
    const ratio = custoMercadoria / base;
    valorMercadoria = round2(valorEtiqueta * ratio);
    valorServicoImpressao = round2(valorEtiqueta - valorMercadoria);
  }

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

  return {
    valorMercadoria,
    valorServico,
    valorMatriz,
    custoMercadoria,
    custoServico,
    ratioMercadoria,
    resumo: `LEGADO dual — não usar (total etiqueta ${valorEtiqueta})`,
  };
}
