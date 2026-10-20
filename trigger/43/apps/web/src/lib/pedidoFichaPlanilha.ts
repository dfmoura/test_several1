/**
 * Grão da ficha planilha do PED (A4 paisagem) — só apresentação.
 * Comercial: 1 linha por modelo. Produção: 1 linha por item de etiqueta.
 * Não persiste campo novo e não altera FAT/OP/contrato retrato.
 */
import type { Pedido, PedidoItem } from './api';
import { facasFromSnapshot, somaValorFacas } from './orcamentoForm';
import {
  comissaoInclusaDoItem,
  linhasEtiquetaDoItem,
  valorMatrizCobradoDoItem,
} from './pedidoFichaContrato';
import {
  descontoDoPedido,
  freteFechamentoDoPedido,
  valorFreteInformadoDoPedido,
} from './pedidoConfirmacao';
import { modoComFrete, normalizarModoEntrega } from './orcamentoFrete';
import { asPedidoSnap, faixaDoItem, qtdeFaixaDoItem, snapInput, specOperacional } from './producaoFicha';

export type PedidoPlanilhaVisual = {
  saida: string | null;
  faca: string | null;
};

export type PedidoPlanilhaComercialLinha = {
  key: string;
  itemOrdem: number;
  /** Primeira linha do documento — Frete/Desc. do cabeçalho. */
  primeiraDoDocumento: boolean;
  /** Primeira linha do item — Matriz/Faca/Comissão do item. */
  primeiraDoItem: boolean;
  quant: number | null;
  medida: string | null;
  larguraCm: number | null;
  puxadaCm: number | null;
  modelo: string;
  material: string | null;
  obs: string | null;
  cores: string | null;
  valorMatriz: number | null;
  valorArte: number;
  valorFaca: number | null;
  valorMilheiro: number | null;
  comissao: number | null;
  frete: number | null;
  freteADefinir: boolean;
  unitario: number | null;
  valorRolo: number | null;
  desconto: number | null;
  subtotal: number;
};

export type PedidoPlanilhaProducaoLinha = {
  key: string;
  itemOrdem: number;
  trocaProduto: string | null;
  /** largura_cm × colunas de produção (bobina mãe). */
  larguraPapelCm: number | null;
  colunasProducao: number | null;
  metragemLinear: number | null;
  m2: number | null;
  acabamento: string | null;
  tubete: string | null;
  colunasRebobinacao: number | null;
  etiqPorRolo: number | null;
  rolos: number | null;
  metrosPorRolo: number | null;
  formatoFaca: string | null;
  nFaca: string | null;
  z: number | null;
  /** Código canônico (SAIDA_*) para o badge; null → célula "—". */
  saidaCodigo: string | null;
  maquina: string | null;
};

function money2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function numPositivo(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function strOrNull(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s !== '' ? s : null;
}

/** Add-on de faca cotada no item (facas[] ou valor_faca_nova da faixa/spec). */
export function valorFacaDoItem(pedido: Pedido, item: PedidoItem): number {
  const spec = specOperacional(pedido, item);
  const facas = facasFromSnapshot(spec);
  const soma = somaValorFacas(facas);
  if (soma > 0.004) return money2(soma);
  const faixa = faixaDoItem(pedido, item);
  for (const raw of [spec.valor_faca_nova, faixa?.valor_faca_nova, faixa?.valor_faca]) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0.004) return money2(n);
  }
  return 0;
}

/** Largura do papel = largura da faca × colunas de produção. */
export function larguraPapelCm(larguraCm: number | null, colunas: number | null): number | null {
  if (larguraCm == null || colunas == null) return null;
  if (larguraCm <= 0 || colunas < 1) return null;
  return money2(larguraCm * colunas);
}

function milheiroDeUnitario(unitario: number | null): number | null {
  if (unitario == null) return null;
  return money2(unitario * 1000);
}

function freteDocumento(pedido: Pedido): { valor: number | null; aDefinir: boolean } {
  const input = snapInput(pedido);
  const faixa = asPedidoSnap(pedido.snapshot).faixa ?? {};
  const modo = normalizarModoEntrega(
    strOrNull(input.modo_entrega) ??
      (typeof faixa.modo_entrega === 'string' ? faixa.modo_entrega : null),
  );
  if (!modoComFrete(modo)) return { valor: 0, aDefinir: false };
  const valor = valorFreteInformadoDoPedido(pedido);
  if (valor == null) return { valor: null, aDefinir: true };
  return { valor: money2(valor), aDefinir: false };
}

function obsLinha(
  pedido: Pedido,
  item: PedidoItem,
  primeiraDoDocumento: boolean,
): string | null {
  const spec = specOperacional(pedido, item);
  const itemObs = strOrNull(spec.observacao);
  if (itemObs) return itemObs;
  if (primeiraDoDocumento) return strOrNull(pedido.observacao);
  return null;
}

function trocaProdutoDoItem(pedido: Pedido, item: PedidoItem): string | null {
  return strOrNull(specOperacional(pedido, item).tipo_troca_produto);
}

function colunasRebobinacaoDoItem(pedido: Pedido, item: PedidoItem): number | null {
  const n = Number(specOperacional(pedido, item).coluna_rebobinacao);
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : null;
}

/**
 * Linhas comerciais (etiqueta = por modelo). Matriz/faca/comissão só na 1ª linha do item;
 * frete/desconto só na 1ª linha do documento.
 */
export function linhasComerciaisPlanilha(
  pedido: Pedido,
  itens: PedidoItem[],
  visualOf: (item: PedidoItem) => PedidoPlanilhaVisual,
): PedidoPlanilhaComercialLinha[] {
  const frete = freteDocumento(pedido);
  const descontoDoc = descontoDoPedido(pedido);
  const out: PedidoPlanilhaComercialLinha[] = [];
  let primeiraDoc = true;

  for (const item of itens) {
    const visual = visualOf(item);
    const linhas = linhasEtiquetaDoItem(pedido, item, visual);
    const matriz = valorMatrizCobradoDoItem(pedido, item);
    const faca = valorFacaDoItem(pedido, item);
    const comissao = comissaoInclusaDoItem(pedido, item);
    const quant = qtdeFaixaDoItem(pedido, item);
    let primeiraItem = true;

    for (const ln of linhas) {
      const isFirstDoc = primeiraDoc;
      const isFirstItem = primeiraItem;
      out.push({
        key: `c-${ln.key}`,
        itemOrdem: ln.ordem,
        primeiraDoDocumento: isFirstDoc,
        primeiraDoItem: isFirstItem,
        quant: quant > 0 ? quant : null,
        medida: ln.medida,
        larguraCm: ln.larguraCm,
        puxadaCm: ln.puxadaCm,
        modelo: ln.modelo,
        material: ln.material,
        obs: obsLinha(pedido, item, isFirstDoc),
        cores: ln.tintas.length > 0 ? ln.tintas.join(', ') : ln.cores,
        valorMatriz: isFirstItem ? (matriz > 0.004 ? matriz : 0) : null,
        valorArte: ln.valorArte,
        valorFaca: isFirstItem ? (faca > 0.004 ? faca : 0) : null,
        valorMilheiro: milheiroDeUnitario(ln.unitario),
        comissao: isFirstItem ? (comissao > 0.004 ? comissao : 0) : null,
        frete: isFirstDoc ? frete.valor : null,
        freteADefinir: isFirstDoc ? frete.aDefinir : false,
        unitario: ln.unitario,
        valorRolo: ln.valorRolo,
        desconto: isFirstDoc ? (descontoDoc > 0.004 ? descontoDoc : 0) : null,
        subtotal: ln.subtotal,
      });
      primeiraDoc = false;
      primeiraItem = false;
    }
  }

  return out;
}

/** Linhas de produção — um por item de etiqueta (física da faixa). */
export function linhasProducaoPlanilha(
  pedido: Pedido,
  itens: PedidoItem[],
  visualOf: (item: PedidoItem) => PedidoPlanilhaVisual,
): PedidoPlanilhaProducaoLinha[] {
  return itens.map((item) => {
    const visual = visualOf(item);
    const linhas = linhasEtiquetaDoItem(pedido, item, visual);
    const base = linhas[0];
    const faixa = faixaDoItem(pedido, item);
    const colunas = base?.colunas ?? null;
    const larguraCm = base?.larguraCm ?? null;
    const rolosFaixa = numPositivo(faixa?.rolos);
    const somaRolos = linhas.reduce((acc, ln) => acc + (ln.rolos ?? 0), 0);
    const rolos = rolosFaixa ?? (somaRolos > 0 ? money2(somaRolos) : null);

    const spec = specOperacional(pedido, item);
    const saidaCodigo = strOrNull(spec.saida_etiqueta);

    return {
      key: `p-${item.id}`,
      itemOrdem: item.ordem,
      trocaProduto: trocaProdutoDoItem(pedido, item),
      larguraPapelCm: larguraPapelCm(larguraCm, colunas),
      colunasProducao: colunas,
      metragemLinear: numPositivo(faixa?.metragem),
      m2: numPositivo(faixa?.m2),
      acabamento: base?.acabamento ?? null,
      tubete: base?.tubete ?? null,
      colunasRebobinacao: colunasRebobinacaoDoItem(pedido, item),
      etiqPorRolo: base?.etiqPorRolo ?? null,
      rolos,
      metrosPorRolo: base?.metrosPorRolo ?? null,
      formatoFaca: base?.faca ?? null,
      nFaca: base?.nFaca ?? null,
      z: base?.z ?? null,
      saidaCodigo,
      maquina: base?.maquina ?? null,
    };
  });
}

/** Eco do fechamento (frete fora do total) — mesma semântica da ficha contrato. */
export function fechamentoPlanilhaHint(pedido: Pedido): string {
  const frete = freteFechamentoDoPedido(pedido);
  return `Frete ${frete.valorTexto} (${frete.nota})`;
}
