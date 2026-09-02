/** Labels de status — Pedidos · OP (estudo trigger/32 GERACAO_PEDIDO + PRODUCAO_OPERACIONAL). */

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

/** Consumo apontado na conclusão: requisitado − retorno − perda. */
export function qtdeConsumidaApontada(
  requisitada: string | number,
  retorno: string | number,
  perda: string | number,
): number {
  const r = Number(requisitada) || 0;
  const ret = Number(retorno) || 0;
  const p = Number(perda) || 0;
  return Math.max(0, r - ret - p);
}
