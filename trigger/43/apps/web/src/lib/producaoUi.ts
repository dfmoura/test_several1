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
