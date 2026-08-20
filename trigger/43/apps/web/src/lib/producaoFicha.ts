import type { OrcamentoFaixaResult, Pedido, PedidoItem } from './api';
import type { ModeloComposicaoForm } from './orcamentoForm';

/**
 * Snapshot do PED (fotografia do ORC aprovado).
 * Preços/margem ficam no JSON do PED — as fichas de chão não os exibem
 * (estudo 32 PRODUCAO §2.6 / ADR-039-PRD-001).
 */
export type PedidoSnap = {
  orcamento_codigo?: string;
  orcamento_versao?: number;
  input?: Record<string, unknown>;
  faixa?: Record<string, unknown>;
  readequacao?: Record<string, unknown>;
};

export function asPedidoSnap(raw: Record<string, unknown> | null | undefined): PedidoSnap {
  if (!raw) return {};
  return raw as PedidoSnap;
}

export function snapInput(pedido: Pedido | null | undefined): Record<string, unknown> {
  const input = asPedidoSnap(pedido?.snapshot).input;
  return input && typeof input === 'object' && !Array.isArray(input) ? input : {};
}

/** Spec do item prevalece; completa com o input do ORC travado. */
export function specOperacional(
  pedido: Pedido | null | undefined,
  item?: PedidoItem | null,
): Record<string, unknown> {
  return { ...snapInput(pedido), ...(item?.especificacao ?? {}) };
}

export function modelosDoSnap(input: Record<string, unknown>): ModeloComposicaoForm[] {
  const raw = input.modelos_composicao;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i) => {
      const r = row as { ordem?: number; nome?: string; percentual?: number };
      return {
        ordem: Number(r.ordem) || i + 1,
        nome: String(r.nome ?? '').trim(),
        percentual: Number(r.percentual) || 0,
      };
    })
    .filter((m) => m.nome !== '');
}

/**
 * Faixa física para a guia de produção — campos de R$ zerados de propósito
 * para não vazar preço/custo no documento de chão.
 */
export function faixaFisica(pedido: Pedido | null | undefined): OrcamentoFaixaResult | null {
  const raw = asPedidoSnap(pedido?.snapshot).faixa;
  if (!raw || typeof raw !== 'object') return null;
  const n = (key: string): number => {
    const v = Number(raw[key]);
    return Number.isFinite(v) ? v : 0;
  };
  if (!n('quantidade') && !n('m2') && !n('metragem')) return null;
  return {
    quantidade: n('quantidade'),
    metragem: n('metragem'),
    m2: n('m2'),
    hora_maq: n('hora_maq'),
    hora_troca_prod: n('hora_troca_prod'),
    hora_troca_bobina: n('hora_troca_bobina'),
    perda_acerto: n('perda_acerto'),
    perda_acabamento: n('perda_acabamento'),
    perda_papel_troca_produto: n('perda_papel_troca_produto'),
    perda_bobina_m2: n('perda_bobina_m2'),
    rolos: n('rolos'),
    qtde_caixas: n('qtde_caixas'),
    rolos_por_caixa: n('rolos_por_caixa'),
    caixa_medida: raw.caixa_medida != null && String(raw.caixa_medida).trim() !== ''
      ? String(raw.caixa_medida)
      : null,
    valor_papel: 0,
    valor_maquina: 0,
    valor_troca_produto: 0,
    valor_troca_bobina: 0,
    valor_papel_troca_produto: 0,
    valor_tinta: 0,
    valor_acabamento: 0,
    valor_rebobinacao: 0,
    valor_tubete: 0,
    valor_caixa: 0,
    valor_servico: 0,
    comissao: 0,
    imposto: 0,
    base: 0,
    valor_etiqueta: 0,
    valor_matriz: 0,
    valor_total: 0,
  };
}

export function pedChipClass(status: string | null | undefined): string {
  switch (status) {
    case 'LIBERADO':
      return 'situacao-ativo';
    case 'EM_PRODUCAO':
      return 'situacao-em_manutencao';
    case 'PRODUZIDO':
      return 'situacao-cedido';
    case 'FATURADO':
    case 'EM_ENTREGA':
      return 'situacao-em_manutencao';
    case 'ENTREGUE':
    case 'ENCERRADO':
      return 'situacao-ativo';
    case 'CANCELADO':
      return 'situacao-baixado';
    default:
      return '';
  }
}

export function opChipClass(status: string | null | undefined): string {
  switch (status) {
    case 'ABERTA':
      return 'situacao-cedido';
    case 'EM_ANDAMENTO':
      return 'situacao-em_manutencao';
    case 'CONCLUIDA':
      return 'situacao-ativo';
    case 'CANCELADA':
      return 'situacao-baixado';
    default:
      return '';
  }
}

export function formatDateTimeBr(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}
