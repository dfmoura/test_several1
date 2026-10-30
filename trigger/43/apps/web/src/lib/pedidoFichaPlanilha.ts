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
  rateioFechado,
  somaValores,
  valorMatrizCobradoDoItem,
} from './pedidoFichaContrato';
import { freteFechamentoDoPedido } from './pedidoConfirmacao';
import { faixaDoItem, specOperacional } from './producaoFicha';

export type PedidoPlanilhaVisual = {
  saida: string | null;
  faca: string | null;
};

export type PedidoPlanilhaComercialLinha = {
  key: string;
  itemOrdem: number;
  /** Primeira linha do documento (obs do PED quando o item não tem obs). */
  primeiraDoDocumento: boolean;
  /** Primeira linha do item (eco residual; medida/largura/puxada/material repetem). */
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
  /** Rateio por modelo (peso = qtde etiquetas); fecha no último. */
  comissao: number | null;
  unitario: number | null;
  valorRolo: number | null;
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
 * Rateio monetário por peso de etiquetas; null se total ≈ 0.
 * Fecha no último peso (mesmo padrão de comissão / subtotal).
 */
function rateioOuNulo(total: number, pesos: number[]): Array<number | null> {
  if (total <= 0.004) return pesos.map(() => null);
  return rateioFechado(total, pesos, 2);
}

/**
 * Linhas comerciais (etiqueta = por modelo).
 * Por modelo (repete / rateia): qtde, medida, largura, puxada, material, arte,
 * matriz, faca, comissão, subtotal (etiquetas). Vlr. rolo = taxa unitária.
 * Frete/desconto ficam no fechamento do documento — não na grade.
 */
export function linhasComerciaisPlanilha(
  pedido: Pedido,
  itens: PedidoItem[],
  visualOf: (item: PedidoItem) => PedidoPlanilhaVisual,
): PedidoPlanilhaComercialLinha[] {
  const out: PedidoPlanilhaComercialLinha[] = [];
  let primeiraDoc = true;

  for (const item of itens) {
    const visual = visualOf(item);
    const linhas = linhasEtiquetaDoItem(pedido, item, visual);
    const pesos = linhas.map((ln) => Math.max(0, ln.etiquetas ?? 0));
    const matrizes = rateioOuNulo(valorMatrizCobradoDoItem(pedido, item), pesos);
    const facas = rateioOuNulo(valorFacaDoItem(pedido, item), pesos);
    const comissoes = rateioOuNulo(comissaoInclusaDoItem(pedido, item), pesos);
    let primeiraItem = true;

    for (let i = 0; i < linhas.length; i++) {
      const ln = linhas[i]!;
      const isFirstDoc = primeiraDoc;
      const isFirstItem = primeiraItem;
      out.push({
        key: `c-${ln.key}`,
        itemOrdem: ln.ordem,
        primeiraDoDocumento: isFirstDoc,
        primeiraDoItem: isFirstItem,
        quant: ln.etiquetas,
        medida: ln.medida,
        larguraCm: ln.larguraCm,
        puxadaCm: ln.puxadaCm,
        modelo: ln.modelo,
        material: ln.material,
        obs: obsLinha(pedido, item, isFirstDoc),
        cores: ln.tintas.length > 0 ? ln.tintas.join(', ') : ln.cores,
        valorMatriz: matrizes[i] ?? null,
        valorArte: ln.valorArte,
        valorFaca: facas[i] ?? null,
        valorMilheiro: milheiroDeUnitario(ln.unitario),
        comissao: comissoes[i] ?? null,
        unitario: ln.unitario,
        valorRolo: ln.valorRolo,
        subtotal: ln.subtotal,
      });
      primeiraDoc = false;
      primeiraItem = false;
    }
  }

  return out;
}

/** Totais de leitura da grade comercial — não recalcula preço travado. */
export type PedidoPlanilhaComercialTotais = {
  quant: number;
  subtotalEtiquetas: number;
  matriz: number;
  faca: number;
  artes: number;
  comissao: number;
  /** `somaValores(itens)` — fonte de verdade do PED. */
  comercial: number;
};

export function totaisComerciaisPlanilha(
  itens: PedidoItem[],
  linhas: PedidoPlanilhaComercialLinha[],
): PedidoPlanilhaComercialTotais {
  return {
    quant: linhas.reduce((acc, ln) => acc + (ln.quant ?? 0), 0),
    subtotalEtiquetas: money2(linhas.reduce((acc, ln) => acc + ln.subtotal, 0)),
    matriz: money2(linhas.reduce((acc, ln) => acc + (ln.valorMatriz ?? 0), 0)),
    faca: money2(linhas.reduce((acc, ln) => acc + (ln.valorFaca ?? 0), 0)),
    artes: money2(linhas.reduce((acc, ln) => acc + (ln.valorArte > 0 ? ln.valorArte : 0), 0)),
    comissao: money2(linhas.reduce((acc, ln) => acc + (ln.comissao ?? 0), 0)),
    comercial: money2(somaValores(itens)),
  };
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
