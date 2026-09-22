/**
 * Helpers UX — resultado ORC documento × itens (ADR_ORC_ITENS).
 * N=1: sem chrome multi. N>1: total do documento + detalhe por item.
 */
import type { OrcamentoItemPreview, OrcamentoResult } from './api';
import { facasFromSnapshot, somaValorFacas, type ModeloComposicaoForm } from './orcamentoForm';
import { totalPropostaFaixa } from './orcamentoFrete';
import type { OrcGuiaProducaoEspec } from './orcamentoGuiaProducao';
import { especFromSnapshot } from './orcamentoGuiaProducao';

export type OrcResultadoItemUi = {
  ordem: number;
  rotulo: string | null;
  result: OrcamentoResult;
  modelosComposicao: ModeloComposicaoForm[];
  quantidadesPorFaixa?: number[][];
  guiaEspec: OrcGuiaProducaoEspec | null;
};

export function isOrcMultiItem(calculo: OrcamentoResult): boolean {
  return Array.isArray(calculo.itens) && calculo.itens.length > 1;
}

export function rotuloItemOrc(ordem: number, rotulo?: string | null): string {
  const r = (rotulo ?? '').trim();
  return r ? `Item ${ordem} · ${r}` : `Item ${ordem}`;
}

export function resumoTotaisItem(result: OrcamentoResult): {
  valorFacas: number;
  valorArtes: number;
  total: number;
} {
  const fx0 = result.faixas?.[0];
  const facas = facasFromSnapshot({
    facas: result.facas,
    faca_nova: result.faca_nova,
    formato_faca: result.formato_faca,
    valor_faca_nova: result.valor_faca_nova,
  });
  const valorFacas = somaValorFacas(facas) || Number(result.valor_faca_nova) || 0;
  const valorArtes = Number(result.valor_artes) || 0;
  const total = fx0
    ? totalPropostaFaixa(fx0, Boolean(result.faca_nova), valorFacas, valorArtes)
    : 0;
  return { valorFacas, valorArtes, total };
}

function modelosFromSnap(snap: Record<string, unknown> | null | undefined): ModeloComposicaoForm[] {
  const raw = Array.isArray(snap?.modelos_composicao) ? snap!.modelos_composicao : [];
  return (raw as ModeloComposicaoForm[]).map((m, i) => ({
    ordem: Number(m.ordem) || i + 1,
    nome: String(m.nome ?? ''),
    percentual: Number(m.percentual) || 0,
    valor_arte: Math.max(0, Number(m.valor_arte) || 0),
    arte_url: String(m.arte_url ?? '').trim() || null,
  }));
}

/**
 * Monta UI por item a partir do preview do motor (+ opcional input do form/show).
 */
export function buildItensResultadoUi(
  calculo: OrcamentoResult,
  extras?: Array<{
    ordem?: number;
    rotulo?: string | null;
    modelosComposicao?: ModeloComposicaoForm[] | null;
    guiaEspec?: OrcGuiaProducaoEspec | null;
    input_snapshot?: Record<string, unknown> | null;
  }> | null,
): OrcResultadoItemUi[] {
  const previews: OrcamentoItemPreview[] =
    calculo.itens && calculo.itens.length > 0
      ? calculo.itens
      : [
          {
            ordem: 1,
            rotulo: null,
            result: calculo,
          },
        ];

  return previews.map((p, i) => {
    const extra = extras?.find((e) => (e.ordem ?? i + 1) === p.ordem) ?? extras?.[i];
    const input = extra?.input_snapshot ?? null;
    const modelos =
      extra?.modelosComposicao ??
      (input ? modelosFromSnap(input) : []);
    const guia =
      extra?.guiaEspec ??
      (input ? especFromSnapshot(input) : null);
    const quantidadesPorFaixa = Array.isArray(input?.modelos_composicao_quantidades)
      ? (input!.modelos_composicao_quantidades as number[][])
      : undefined;
    return {
      ordem: p.ordem,
      rotulo: p.rotulo ?? extra?.rotulo ?? null,
      result: p.result ?? calculo,
      modelosComposicao: (modelos ?? []).filter((m) => String(m.nome ?? '').trim() !== ''),
      quantidadesPorFaixa,
      guiaEspec: guia,
    };
  });
}
