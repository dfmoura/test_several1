/** Labels de status — Pedidos · OP (estudo trigger/32 GERACAO_PEDIDO + PRODUCAO_OPERACIONAL). */

/** Cadeia PED (Pedido::STATUSES) — ordem do pipeline operacional. */
export const PED_STATUSES = [
  'LIBERADO',
  'EM_PRODUCAO',
  'PRODUZIDO',
  'FATURADO',
  'EM_ENTREGA',
  'ENTREGUE',
  'ENCERRADO',
  'CANCELADO',
] as const;

export type PedStatus = (typeof PED_STATUSES)[number];

const PED_LABELS: Record<string, string> = {
  LIBERADO: 'Liberado',
  EM_PRODUCAO: 'Em produção',
  PRODUZIDO: 'Produzido',
  FATURADO: 'Faturado',
  EM_ENTREGA: 'Em entrega',
  ENTREGUE: 'Entregue',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
};

const PED_ITEM_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_PRODUCAO: 'Em produção',
  PRODUZIDO: 'Produzido',
  CANCELADO: 'Cancelado',
};

const NEC_LABELS: Record<string, string> = {
  PRODUCAO: 'Produção',
  SERVICO: 'Serviço',
  REVENDA: 'Revenda',
};

const OP_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const MAT_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  REQUISITADO: 'Requisitado',
  AGUARDANDO_MATERIAL: 'Aguardando material',
};

export function pedStatusLabel(status: string): string {
  return PED_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function pedItemStatusLabel(status: string): string {
  return PED_ITEM_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function necessidadeLabel(necessidade: string): string {
  return NEC_LABELS[necessidade] ?? necessidade.replace(/_/g, ' ');
}

export function opStatusLabel(status: string): string {
  return OP_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function opMaterialStatusLabel(status: string): string {
  return MAT_LABELS[status] ?? status.replace(/_/g, ' ');
}

/** Status operacional da linha de material (empenho leve × saldo). */
export function opMaterialLinhaStatus(m: {
  pendente?: boolean;
  aguardando_material?: boolean;
}): string {
  if (m.aguardando_material) return 'AGUARDANDO_MATERIAL';
  return m.pendente ? 'PENDENTE' : 'REQUISITADO';
}

/** Resumo leve de linhas de material na OP (empenho leve → requisição). */
export function opMaterialResumoLabel(resumo: {
  total: number;
  pendentes: number;
  requisitados: number;
}): string {
  if (resumo.total <= 0) {
    return 'Sem linhas de material';
  }
  if (resumo.pendentes === 0) {
    return `Requisitado (${resumo.requisitados}/${resumo.total})`;
  }
  if (resumo.requisitados === 0) {
    return `Pendente (${resumo.pendentes}/${resumo.total})`;
  }
  return `Parcial · ${resumo.requisitados} requisitado(s), ${resumo.pendentes} pendente(s)`;
}

/** Passo corrente da OP para a faixa de andamento no chão. */
export function opPassoAtual(op: {
  status: string;
  materiais?: Array<{ pendente?: boolean }> | null;
}): 'separar' | 'produzir' | 'concluir' | 'pedido' {
  if (op.status === 'CONCLUIDA' || op.status === 'CANCELADA') {
    return 'pedido';
  }
  const mats = op.materiais ?? [];
  const temPendencia = mats.some((m) => m.pendente);
  const temSaida = mats.some((m) => !m.pendente);
  if (mats.length > 0 && temPendencia && !temSaida) {
    return 'separar';
  }
  if (op.status === 'ABERTA' && (!temSaida || mats.length === 0)) {
    return 'separar';
  }
  if (op.status === 'EM_ANDAMENTO' || temSaida) {
    return temPendencia ? 'produzir' : 'concluir';
  }
  return 'separar';
}

/** Quantidade digitada (aceita vírgula BR ou ponto). */
export function parseQtdeDigitada(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim().replace(/\s/g, '');
  if (raw === '') return 0;
  // 1.234,56 → 1234.56 | 1234,56 → 1234.56 | 1234.56 → 1234.56
  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Consumo apontado na conclusão: requisitado − retorno − perda. */
export function qtdeConsumidaApontada(
  requisitada: string | number,
  retorno: string | number,
  perda: string | number,
): number {
  const r = parseQtdeDigitada(requisitada);
  const ret = parseQtdeDigitada(retorno);
  const p = parseQtdeDigitada(perda);
  return Math.max(0, r - ret - p);
}
