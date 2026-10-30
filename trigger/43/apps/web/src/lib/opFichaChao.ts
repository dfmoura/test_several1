/**
 * Grão da ficha de chão unificada da OP — impressão, acabamento e retirada.
 * Satélite da ficha flexo retrato. Sem R$. Sem writer (confirmação em A buscar).
 */
import type { OrdemProducao, Pedido, PedidoItem } from './api';
import { formatoLabel } from '../components/FacaShapeIcon';
import { formatDate, formatDecimalBr } from './format';
import { descricaoFromPedidoSpec } from './orcamentoPropostaItens';
import {
  linhasComerciaisPlanilha,
  linhasProducaoPlanilha,
  type PedidoPlanilhaComercialLinha,
  type PedidoPlanilhaProducaoLinha,
  type PedidoPlanilhaVisual,
} from './pedidoFichaPlanilha';
import {
  formatNecessidadeOp,
  opKitLinhasOrdenadas,
  volumesParaEscolha,
} from './producaoPick';
import { specOperacional } from './producaoFicha';
import { opKitEstado, opKitNome, opKitOnde } from './producaoUi';
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

/** Linha plana para caminhada na prateleira (volume a volume). */
export type OpFichaChaoRetiradaLinha = {
  key: string;
  local: string;
  volume: string;
  material: string;
  levar: string;
  validade: string;
};

function fmtLevar(qtde: number | string | null | undefined, unidade: string | null | undefined): string {
  const n = Number(qtde);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const scale = Math.abs(n - Math.round(n)) < 1e-6 ? 0 : 2;
  const q = formatDecimalBr(n, scale, { stripTrailingZeros: true });
  const u = (unidade ?? '').trim();
  return u ? `${q} ${u}` : q;
}

/**
 * Volumes a pegar (FEFO) ou já baixados — uma linha por volume.
 * Sem prosa; sem segundo writer.
 */
export function linhasRetiradaChao(ordem: OrdemProducao): OpFichaChaoRetiradaLinha[] {
  const out: OpFichaChaoRetiradaLinha[] = [];
  for (const m of opKitLinhasOrdenadas(ordem.materiais ?? [])) {
    const estado = opKitEstado(m);
    const nome = opKitNome(m);
    const vols =
      estado === 'ja_saiu'
        ? (m.retirada?.volumes_baixados ?? [])
        : volumesParaEscolha(m).filter((v) => Number(v.qtde_retirar) > 0 || v.sugerido);

    if (vols.length === 0) {
      if (estado === 'sem_estoque') {
        out.push({
          key: `${m.id}-sem`,
          local: '—',
          volume: '—',
          material: nome,
          levar: 'Sem saldo',
          validade: '—',
        });
        continue;
      }
      const onde = opKitOnde(m);
      out.push({
        key: `${m.id}-saldo`,
        local: onde === '—' ? 'Saldo' : onde,
        volume: '—',
        material: nome,
        levar: formatNecessidadeOp(m, ordem),
        validade: '—',
      });
      continue;
    }

    vols.forEach((v, i) => {
      out.push({
        key: `${m.id}-${v.lote_id ?? v.codigo ?? i}`,
        local: (v.endereco?.codigo ?? '').trim() || '—',
        volume: (v.codigo ?? '').trim() || '—',
        material: nome,
        levar: fmtLevar(v.qtde_retirar, v.unidade ?? m.unidade),
        validade: v.data_validade ? formatDate(v.data_validade) : '—',
      });
    });
  }
  return out;
}

export function opFichaChaoMeta(): {
  titulo: string;
  docLabel: string;
  secaoImpressao: string;
  hintImpressao: string;
  secaoAcabamento: string;
  secaoRetirada: string;
  hintRetirada: string;
  toolbarHint: string;
} {
  return {
    titulo: 'Ficha de chão',
    docLabel: 'Impressão · rebobinação · retirada · A4 paisagem',
    secaoImpressao: 'Impressão · máquina',
    hintImpressao: 'Largura do papel = largura × colunas de produção',
    secaoAcabamento: 'Acabamento · rebobinação',
    secaoRetirada: 'Retirada · prateleira',
    hintRetirada: 'Marque Levado. Confirme a saída na tela A buscar.',
    toolbarHint: 'Máquina e prateleira · A4 paisagem · sem preço',
  };
}
