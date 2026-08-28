/**
 * Defaults comerciais do PAR — semente para OC/ORC/PED/TIT (snapshot no documento).
 * ADR: docs/ADR_CONDICOES_COMERCIAIS_PAR.md · estudo 32 CADASTRO_PARCEIROS / FATURAMENTO.
 */

export const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Transferência', label: 'Transferência' },
  { value: 'Cartão', label: 'Cartão' },
] as const;

export type FormaPagamentoCanonico = (typeof FORMAS_PAGAMENTO)[number]['value'];

/** Sugestões canônicas iniciais (seed) — runtime usa cadastro por EMP. */
export const CONDICOES_PAGAMENTO_SUGESTOES = [
  'À vista',
  'PIX antecipado',
  '50% sinal + 50% 28 DDL',
  '7 DDL',
  '14 DDL',
  '21 DDL',
  '28 DDL',
  '14/28',
  '14/28/42',
  '28/35/42',
] as const;

const FORMAS_SET = new Set<string>(FORMAS_PAGAMENTO.map((f) => f.value));

export function formaPagamentoLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const hit = FORMAS_PAGAMENTO.find((f) => f.value.toLowerCase() === value.trim().toLowerCase());
  return hit?.label ?? value;
}

export function isFormaPagamentoCanonica(value: string | null | undefined): boolean {
  if (!value) return false;
  return FORMAS_SET.has(value.trim()) || FORMAS_PAGAMENTO.some((f) => f.value.toLowerCase() === value.trim().toLowerCase());
}

export type CondicoesParceiroResumo = {
  condicao_pagamento?: string | null;
  forma_pagamento?: string | null;
  limite_credito?: string | null;
  papel_cliente?: boolean;
};

/** Texto curto para hint em ORC/OC — não substitui snapshot do documento. */
export function resumoCondicoesParceiro(p: CondicoesParceiroResumo): string | null {
  const parts: string[] = [];
  if (p.condicao_pagamento?.trim()) parts.push(p.condicao_pagamento.trim());
  if (p.forma_pagamento?.trim()) parts.push(formaPagamentoLabel(p.forma_pagamento));
  if (p.papel_cliente && p.limite_credito != null && String(p.limite_credito).trim() !== '') {
    const n = Number(String(p.limite_credito).replace(',', '.'));
    if (Number.isFinite(n)) {
      parts.push(
        n <= 0
          ? 'limite R$ 0 (sinal / à vista)'
          : `limite R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      );
    }
  }
  return parts.length ? parts.join(' · ') : null;
}
