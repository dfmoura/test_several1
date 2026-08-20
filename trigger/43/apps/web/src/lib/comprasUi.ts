/** Labels de status — Compras · Estoque · Contas a pagar (BL-033). */

const OC_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  PARCIAL: 'Parcial',
  RECEBIDA: 'Recebida',
  CANCELADA: 'Cancelada',
};

const NEC_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
};

const COT_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ABERTA: 'Aberta',
  DECIDIDA: 'Decidida',
  CANCELADA: 'Cancelada',
};

const TIT_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  PARCIAL: 'Parcial',
  QUITADO: 'Quitado',
  CANCELADO: 'Cancelado',
};

export function ocStatusLabel(status: string): string {
  return OC_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function necStatusLabel(status: string): string {
  return NEC_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function cotStatusLabel(status: string): string {
  return COT_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function titStatusLabel(status: string): string {
  return TIT_LABELS[status] ?? status.replace(/_/g, ' ');
}

const AJU_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  CANCELADO: 'Cancelado',
};

const INV_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_CONTAGEM: 'Em contagem',
  CONFRONTADO: 'Confrontado',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
};

const INV_ITEM_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_CONTAGEM: 'Em contagem',
  CONTADO_1: 'Contado 1',
  DIVERGENTE: 'Divergente',
  RECONTADO: 'Recontado',
  OK: 'Ok',
  AJU_PENDENTE: 'AJU pendente',
  AJU_GERADO: 'AJU gerado',
};

const INV_TIPO_LABELS: Record<string, string> = {
  ROTATIVO: 'Rotativo',
  GERAL: 'Geral',
  VIRADA: 'Virada',
};

export function ajStatusLabel(status: string): string {
  return AJU_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function invStatusLabel(status: string): string {
  return INV_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function invItemStatusLabel(status: string): string {
  return INV_ITEM_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function invTipoLabel(tipo: string): string {
  return INV_TIPO_LABELS[tipo] ?? tipo.replace(/_/g, ' ');
}
