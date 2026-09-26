/**
 * Grão comercial da ficha do PED — só apresentação.
 * Etiqueta = uma linha por modelo; valores derivados da spec/faixa já travadas.
 * Não persiste campo novo e não altera FAT/OP.
 */
import type { Pedido, PedidoItem } from './api';
import {
  alocarQuantidadePorModelo,
  reconciliarMatrizFaixaRow,
} from './orcamentoForm';
import { descricaoFromPedidoSpec } from './orcamentoPropostaItens';
import {
  faixaDoItem,
  faixaIndexDoItem,
  matrizQuantidadesDoItem,
  modelosDoSnap,
  qtdeFaixaDoItem,
  specOperacional,
} from './producaoFicha';

export type PedidoFichaEtiquetaLinha = {
  key: string;
  itemId: number;
  ordem: number;
  material: string | null;
  medida: string | null;
  acabamento: string | null;
  tubete: string | null;
  cores: string | null;
  saida: string | null;
  faca: string | null;
  faixa: string | null;
  modelo: string;
  etiqPorRolo: number | null;
  rolos: number | null;
  etiquetas: number | null;
  subtotal: number;
  unitario: number | null;
  valorRolo: number | null;
};

export type PedidoFichaSimplesLinha = {
  itemId: number;
  ordem: number;
  sku: string | null;
  descricao: string;
  qtde: number;
  unidade: string;
  unitario: number | null;
  total: number;
};

/** Rateio que fecha no último peso. `scale=0` inteiro; senão casas decimais. */
export function rateioFechado(total: number, pesos: number[], scale: number): number[] {
  const n = pesos.length;
  if (n === 0) return [];
  const factor = 10 ** Math.max(0, scale);
  const target = Math.round(total * factor);
  const limpos = pesos.map((p) => Math.max(0, p));
  const pesoTotal = limpos.reduce((s, p) => s + p, 0);
  if (pesoTotal <= 0) {
    const zeros = Array.from({ length: n }, () => 0);
    zeros[n - 1] = target / factor;
    return zeros;
  }
  let alocado = 0;
  return limpos.map((p, i) => {
    if (i === n - 1) {
      return (target - alocado) / factor;
    }
    const qi = Math.floor((target * p) / pesoTotal + 1e-9);
    alocado += qi;
    return qi / factor;
  });
}

export function particionarItensPedido(itens: PedidoItem[]): {
  etiquetas: PedidoItem[];
  revendas: PedidoItem[];
  servicos: PedidoItem[];
} {
  const etiquetas: PedidoItem[] = [];
  const revendas: PedidoItem[] = [];
  const servicos: PedidoItem[] = [];
  for (const it of itens) {
    if (it.necessidade === 'REVENDA') revendas.push(it);
    else if (it.necessidade === 'SERVICO') servicos.push(it);
    else etiquetas.push(it);
  }
  return { etiquetas, revendas, servicos };
}

export function etiquetasPorModeloDoItem(
  pedido: Pedido,
  item: PedidoItem,
): Array<{ nome: string; etiquetas: number }> {
  const spec = specOperacional(pedido, item);
  const modelos = modelosDoSnap(spec);
  const qtde = Math.max(0, Math.floor(qtdeFaixaDoItem(pedido, item)) || 0);
  if (modelos.length === 0) {
    return [{ nome: '—', etiquetas: qtde }];
  }
  const faixaIdx = faixaIndexDoItem(pedido, item);
  const stored = matrizQuantidadesDoItem(item)?.[faixaIdx];
  const qs =
    Array.isArray(stored) && stored.length === modelos.length
      ? reconciliarMatrizFaixaRow(stored, qtde)
      : alocarQuantidadePorModelo(qtde, modelos).map((r) => r.quantidade);
  return modelos.map((m, i) => ({
    nome: m.nome || `Modelo ${i + 1}`,
    etiquetas: qs[i] ?? 0,
  }));
}

function numPositivo(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function money2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function etiqPorRoloDoItem(pedido: Pedido, item: PedidoItem): number | null {
  const spec = specOperacional(pedido, item);
  const desc = descricaoFromPedidoSpec(spec);
  const faixa = faixaDoItem(pedido, item);
  return (
    numPositivo(desc.etiq_por_rolo) ??
    numPositivo(faixa?.etiq_por_rolo) ??
    null
  );
}

function valorEtiquetaDoItem(pedido: Pedido, item: PedidoItem, unitario: number | null): number {
  const faixa = faixaDoItem(pedido, item);
  const daFaixa = numPositivo(faixa?.valor_etiqueta);
  if (daFaixa != null) return money2(daFaixa);
  const qtde = qtdeFaixaDoItem(pedido, item);
  if (unitario != null && qtde > 0) return money2(unitario * qtde);
  const total = Number(item.valor_total);
  return Number.isFinite(total) && total > 0 ? money2(total) : 0;
}

/** Residual do item (contrato − etiquetas). Não rateia por arte. */
export function matrizResidualDoItem(pedido: Pedido, item: PedidoItem): number {
  const unitario = numPositivo(item.preco_unitario);
  const valorEtiqueta = valorEtiquetaDoItem(pedido, item, unitario);
  const total = Number(item.valor_total);
  if (Number.isFinite(total) && total > 0) {
    const residual = money2(total - valorEtiqueta);
    return residual > 0.004 ? residual : 0;
  }
  const faixa = faixaDoItem(pedido, item);
  const daFaixa = Number(faixa?.valor_matriz);
  if (Number.isFinite(daFaixa) && daFaixa > 0.004) return money2(daFaixa);
  return 0;
}

function rolosAlvo(pedido: Pedido, item: PedidoItem, etiqPorRolo: number | null): number | null {
  const faixa = faixaDoItem(pedido, item);
  const daFaixa = numPositivo(faixa?.rolos);
  if (daFaixa != null) return daFaixa;
  const qtde = qtdeFaixaDoItem(pedido, item);
  if (etiqPorRolo != null && qtde > 0) return qtde / etiqPorRolo;
  return null;
}

export function linhasEtiquetaDoItem(
  pedido: Pedido,
  item: PedidoItem,
  visual: {
    saida: string | null;
    faca: string | null;
  },
): PedidoFichaEtiquetaLinha[] {
  const spec = specOperacional(pedido, item);
  const desc = descricaoFromPedidoSpec(spec);
  const aloc = etiquetasPorModeloDoItem(pedido, item);
  const pesos = aloc.map((a) => a.etiquetas);
  const etiqPorRolo = etiqPorRoloDoItem(pedido, item);
  const unitario = numPositivo(item.preco_unitario);
  const valorEtiqueta = valorEtiquetaDoItem(pedido, item, unitario);
  const subtotais = rateioFechado(valorEtiqueta, pesos, 2);
  const alvoRolos = rolosAlvo(pedido, item, etiqPorRolo);
  const scaleRolos =
    alvoRolos != null && Math.abs(alvoRolos - Math.round(alvoRolos)) < 1e-6 ? 0 : 2;
  const rolos =
    alvoRolos != null ? rateioFechado(alvoRolos, pesos, scaleRolos) : aloc.map(() => null);
  const valorRolo =
    unitario != null && etiqPorRolo != null ? money2(unitario * etiqPorRolo) : null;
  const faixaIdx = faixaIndexDoItem(pedido, item);

  const base = {
    itemId: item.id,
    ordem: item.ordem,
    material: desc.papel ?? null,
    medida: desc.medida ?? null,
    acabamento: desc.acabamento ?? null,
    tubete: desc.tubete ?? null,
    cores: desc.cores ?? null,
    saida: visual.saida,
    faca: visual.faca,
    faixa: `#${faixaIdx + 1}`,
    etiqPorRolo,
    unitario,
    valorRolo,
  };

  return aloc.map((a, i) => ({
    ...base,
    key: `${item.id}-m-${i}`,
    modelo: a.nome,
    rolos: rolos[i] ?? null,
    etiquetas: a.etiquetas,
    subtotal: subtotais[i] ?? 0,
  }));
}

export function linhaSimplesDoItem(pedido: Pedido, item: PedidoItem): PedidoFichaSimplesLinha {
  const spec = specOperacional(pedido, item);
  const desc = descricaoFromPedidoSpec(spec);
  const isRevenda = item.necessidade === 'REVENDA';
  const sku = isRevenda ? desc.produto_codigo || null : null;
  const descricao = isRevenda
    ? desc.produto_descricao || item.descricao || 'Revenda'
    : desc.descricao_servico || item.descricao || 'Serviço';
  return {
    itemId: item.id,
    ordem: item.ordem,
    sku,
    descricao,
    qtde: Number(item.qtde_pedida) || 0,
    unidade: item.unidade || desc.unidade || '',
    unitario: numPositivo(item.preco_unitario),
    total: Number(item.valor_total) || 0,
  };
}

export function somaValores(itens: PedidoItem[]): number {
  return itens.reduce((acc, it) => acc + (Number(it.valor_total) || 0), 0);
}
