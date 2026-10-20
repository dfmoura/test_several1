/**
 * Grão da ficha de materiais da OP (A4 paisagem) — só apresentação.
 * Liberada após saída lógica (SAIDA_PRODUCAO). Guia da saída física.
 * Bobina: mesma conta da planilha do PED (largura × colunas).
 * Kit na ficha: só linhas já baixadas. Sem MOV, sem segundo writer.
 */
import type { OrdemProducao, OrdemProducaoMaterial, Pedido, PedidoItem } from './api';
import { descricaoFromPedidoSpec } from './orcamentoPropostaItens';
import { larguraPapelCm, linhasProducaoPlanilha } from './pedidoFichaPlanilha';
import { formatQtdeMaterial } from './producaoPick';
import { faixaDoItem, snapInput, specOperacional } from './producaoFicha';
import {
  OP_COMPONENTE_ORDEM,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  parseQtdeDigitada,
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

/** Saída lógica confirmada (MOV) — estado «já saiu». */
export function materialComSaidaLogica(m: {
  saida_movimento_id?: number | null;
  pendente?: boolean;
}): boolean {
  if (m.saida_movimento_id != null && m.saida_movimento_id > 0) return true;
  return m.pendente === false;
}

/**
 * Ficha de retirada física só depois de pelo menos uma baixa no kit.
 * Confirmar continua em Estoque · A buscar.
 */
export function podeVerFichaMateriais(ordem: OrdemProducao | null | undefined): boolean {
  return (ordem?.materiais ?? []).some(materialComSaidaLogica);
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

function qtdeSaidaFisica(m: OrdemProducaoMaterial, ordem: OrdemProducao): string {
  const req = parseQtdeDigitada(m.qtde_requisitada);
  if (req > 0) return formatQtdeMaterial(m, ordem, req);
  const plan = parseQtdeDigitada(m.qtde_planejada);
  if (plan > 0) return formatQtdeMaterial(m, ordem, plan);
  return '—';
}

/** Só linhas com saída lógica — o que pode sair fisicamente. */
export function insumosComSaidaLogica(ordem: OrdemProducao): OpFichaMateriaisInsumo[] {
  const linhas = (ordem.materiais ?? [])
    .filter(materialComSaidaLogica)
    .sort((a, b) => {
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
      qtde: qtdeSaidaFisica(m, ordem),
      situacao: opKitEstadoLabel(estado),
      estado,
      componente: (m.componente ?? '').trim().toUpperCase() || 'MANUAL',
    };
  });
}
