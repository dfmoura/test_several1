/**
 * Grão da ficha de chão unificada da OP (Impressão + Acabamento) — só apresentação.
 * Satélite da ficha flexo retrato. Reusa a planilha do PED sem R$.
 * Sem persistir campo novo; sem alterar kit, materiais ou ficha flexo.
 */
import type { OrdemProducao, Pedido, PedidoItem } from './api';
import { formatoLabel } from '../components/FacaShapeIcon';
import { descricaoFromPedidoSpec } from './orcamentoPropostaItens';
import {
  linhasComerciaisPlanilha,
  linhasProducaoPlanilha,
  type PedidoPlanilhaComercialLinha,
  type PedidoPlanilhaProducaoLinha,
  type PedidoPlanilhaVisual,
} from './pedidoFichaPlanilha';
import { specOperacional } from './producaoFicha';
import { saidaEtiquetaLabelCurto } from './saidaEtiqueta';

export function itemPedidoDaOp(
  ordem: OrdemProducao,
  pedido: Pedido | null,
): PedidoItem | null {
  if (!pedido?.itens?.length) return null;
  const id = ordem.pedido_item?.id;
  if (id != null) {
    const found = pedido.itens.find((i) => i.id === id);
    if (found) return found;
  }
  /* Mesmo fallback da ficha flexo / materiais — OP quase sempre 1 item. */
  return pedido.itens[0] ?? null;
}

export function visualPlanilhaOf(pedido: Pedido, item: PedidoItem): PedidoPlanilhaVisual {
  const spec = specOperacional(pedido, item);
  const desc = descricaoFromPedidoSpec(spec);
  const saida = saidaEtiquetaLabelCurto(
    String(spec.saida_etiqueta ?? desc.saida_etiqueta ?? ''),
  );
  const formato = spec.formato_faca != null ? String(spec.formato_faca) : '';
  const faca = formato
    ? `${formatoLabel(formato)}${spec.faca_nova ? ' · nova' : ''}`
    : null;
  return { saida: saida || null, faca };
}

/** Identidade do item (1 linha por modelo) — sem colunas de dinheiro. */
export function linhasIdentidadeChao(
  pedido: Pedido,
  item: PedidoItem,
): PedidoPlanilhaComercialLinha[] {
  return linhasComerciaisPlanilha(pedido, [item], (it) => visualPlanilhaOf(pedido, it));
}

/** Parâmetros de máquina / produção — 1 linha por item. */
export function linhaProducaoChao(
  pedido: Pedido,
  item: PedidoItem,
): PedidoPlanilhaProducaoLinha | null {
  const [ln] = linhasProducaoPlanilha(pedido, [item], (it) => visualPlanilhaOf(pedido, it));
  return ln ?? null;
}

export function opFichaChaoMeta(): {
  titulo: string;
  docLabel: string;
  secaoImpressao: string;
  hintImpressao: string;
  secaoAcabamento: string;
  toolbarHint: string;
} {
  return {
    titulo: 'Impressão e acabamento',
    docLabel: 'Ficha de chão · impressão e rebobinação',
    secaoImpressao: 'Impressão · máquina',
    hintImpressao: 'Largura do papel = largura × colunas de produção',
    secaoAcabamento: 'Acabamento · rebobinação',
    toolbarHint: 'Impressão e acabamento · A4 paisagem · sem preço · chão',
  };
}
