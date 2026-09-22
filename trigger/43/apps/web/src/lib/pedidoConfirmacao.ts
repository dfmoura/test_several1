/**
 * Helpers comerciais do PED (snapshot.input + itens travados).
 * Usados no detalhe e na ficha operacional — sem guia de chão nem gordura.
 */
import type { Pedido } from './api';
import { formatCep, formatCurrency } from './format';
import {
  MODO_ENTREGA_TERCEIROS,
  MODO_RETIRAR,
  modoComFrete,
  normalizarModoEntrega,
} from './orcamentoFrete';
import { asPedidoSnap, snapInput } from './producaoFicha';

export function strSnap(input: Record<string, unknown>, key: string): string | null {
  const v = input[key];
  if (v == null) return null;
  const s = String(v).trim();
  return s !== '' ? s : null;
}

/** Texto de frete alinhado ao dto comercial do ORC (proposta). */
export function freteTextoDoPedido(pedido: Pedido): string | null {
  const input = snapInput(pedido);
  const faixa = asPedidoSnap(pedido.snapshot).faixa ?? {};
  const modo = normalizarModoEntrega(
    strSnap(input, 'modo_entrega') ??
      (typeof faixa.modo_entrega === 'string' ? faixa.modo_entrega : null),
  );

  if (modo === MODO_RETIRAR) {
    return 'Retirada no local';
  }

  const rotulo = modo === MODO_ENTREGA_TERCEIROS ? 'Entrega por terceiros' : 'Entrega própria';

  let valor: number | null = null;
  const fromFaixa = faixa.valor_frete;
  const fromInput = input.valor_frete_manual;
  for (const raw of [fromFaixa, fromInput]) {
    if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
      valor = Number(raw);
      break;
    }
  }

  if (!modoComFrete(modo)) {
    return rotulo;
  }
  if (valor == null) {
    return `${rotulo} — frete a definir`;
  }
  if (valor <= 0) {
    return `${rotulo} — sem cobrança de frete`;
  }
  return `${rotulo} — frete ${formatCurrency(valor)}`;
}

export function condicaoPagamentoDoPedido(pedido: Pedido): string | null {
  return strSnap(snapInput(pedido), 'condicao_pagamento');
}

export function formaPagamentoDoPedido(pedido: Pedido): string | null {
  return strSnap(snapInput(pedido), 'forma_pagamento');
}

export function urlArteDoPedido(pedido: Pedido): string | null {
  return strSnap(snapInput(pedido), 'url_arte');
}

/** Endereço comercial completo (logradouro → CEP) para detalhe / ficha / proposta. */
export function formatEnderecoParceiro(p: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
} | null | undefined): string | null {
  if (!p) return null;
  const line1 = [p.logradouro, p.numero ? `nº ${p.numero}` : null, p.complemento]
    .filter(Boolean)
    .join(', ');
  const cepFmt = p.cep ? formatCep(p.cep) : null;
  const line2 = [p.bairro, [p.municipio, p.uf].filter(Boolean).join('/'), cepFmt]
    .filter(Boolean)
    .join(' · ');
  const full = [line1, line2].filter(Boolean).join(' · ');
  return full || null;
}
