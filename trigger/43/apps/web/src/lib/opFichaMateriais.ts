/**
 * Grão da ficha de materiais da OP (A4 paisagem) — só apresentação.
 * Bobina: mesma conta da planilha do PED (largura × colunas).
 * Demais insumos: kit vivo da OP. Sem MOV, sem segundo writer.
 */
import type { OrdemProducao, Pedido, PedidoItem } from './api';
import { descricaoFromPedidoSpec } from './orcamentoPropostaItens';
import { larguraPapelCm, linhasProducaoPlanilha } from './pedidoFichaPlanilha';
import { formatNecessidadeOp } from './producaoPick';
import { faixaDoItem, snapInput, specOperacional } from './producaoFicha';
import {
  OP_COMPONENTE_ORDEM,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  type OpKitEstado,
} from './producaoUi';

export type OpFichaMateriaisBobina = {
  itemOrdem: number | null;
  material: string | null;
  larguraPapelCm: number | null;
  metragemLinear: number | null;
  m2: number | null;
  acabamento: string | null;
  tubete: string | null;
};

export type OpFichaMateriaisInsumo = {
  id: number;
  nome: string;
  qtde: string;
  situacao: string;
  estado: OpKitEstado;
  componente: string;
};

function strOrNull(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s !== '' ? s : null;
}

function numPositivo(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function itemDaOrdem(ordem: OrdemProducao, pedido: Pedido | null): PedidoItem | null {
  if (!pedido?.itens?.length) return null;
  const id = ordem.pedido_item?.id;
  if (id != null) {
    return pedido.itens.find((i) => i.id === id) ?? null;
  }
  return pedido.itens[0] ?? null;
}

function materialDoPapelKit(ordem: OrdemProducao): string | null {
  const papel = (ordem.materiais ?? []).find(
    (m) => (m.componente ?? '').toUpperCase() === 'PAPEL',
  );
  return strOrNull(papel?.origem_texto) ?? strOrNull(papel?.produto?.descricao_fiscal);
}

/** Linha de bobina mãe — valores travados da faixa/spec do PED. */
export function bobinaDaOrdem(
  ordem: OrdemProducao,
  pedido: Pedido | null,
): OpFichaMateriaisBobina | null {
  const item = itemDaOrdem(ordem, pedido);
  if (pedido && item && item.necessidade === 'PRODUCAO') {
    const [ln] = linhasProducaoPlanilha(pedido, [item], () => ({
      saida: null,
      faca: null,
    }));
    const spec = specOperacional(pedido, item);
    const desc = descricaoFromPedidoSpec(spec);
    return {
      itemOrdem: ln?.itemOrdem ?? item.ordem ?? null,
      material: strOrNull(desc.papel) ?? materialDoPapelKit(ordem),
      larguraPapelCm: ln?.larguraPapelCm ?? null,
      metragemLinear: ln?.metragemLinear ?? null,
      m2: ln?.m2 ?? null,
      acabamento: ln?.acabamento ?? strOrNull(desc.acabamento),
      tubete: ln?.tubete ?? strOrNull(desc.tubete),
    };
  }

  // Fallback sem PED completo: spec no snapshot da OP / kit.
  const input = pedido ? snapInput(pedido) : {};
  const largura = numPositivo(input.largura_cm);
  const colunas = numPositivo(input.colunas);
  const faixa = pedido && item ? faixaDoItem(pedido, item) : null;
  const material = materialDoPapelKit(ordem);
  const temAlgo =
    material ||
    largura ||
    numPositivo(faixa?.metragem) ||
    numPositivo(faixa?.m2) ||
    (ordem.materiais ?? []).length > 0;
  if (!temAlgo) return null;

  return {
    itemOrdem: item?.ordem ?? null,
    material,
    larguraPapelCm: larguraPapelCm(largura, colunas),
    metragemLinear: numPositivo(faixa?.metragem),
    m2: numPositivo(faixa?.m2),
    acabamento: strOrNull(input.acabamento),
    tubete: strOrNull(input.tubete_rotulo) ?? strOrNull(input.tubete),
  };
}

function ordemComponente(componente: string): number {
  const key = componente.trim().toUpperCase();
  const idx = (OP_COMPONENTE_ORDEM as readonly string[]).indexOf(key);
  return idx >= 0 ? idx : OP_COMPONENTE_ORDEM.length;
}

/** Kit completo — o que sai do estoque, fora do grão da bobina. */
export function insumosDoKit(ordem: OrdemProducao): OpFichaMateriaisInsumo[] {
  const linhas = [...(ordem.materiais ?? [])].sort((a, b) => {
    const ca = ordemComponente(a.componente ?? '');
    const cb = ordemComponente(b.componente ?? '');
    if (ca !== cb) return ca - cb;
    return opKitNome(a).localeCompare(opKitNome(b), 'pt-BR');
  });

  return linhas.map((m) => {
    const estado = opKitEstado(m);
    return {
      id: m.id,
      nome: opKitNome(m),
      qtde: formatNecessidadeOp(m, ordem),
      situacao: opKitEstadoLabel(estado),
      estado,
      componente: (m.componente ?? '').trim().toUpperCase() || 'MANUAL',
    };
  });
}
