type StatusPillProps = {
  status: string;
};

function pillVariant(status: string): string {
  const key = status
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/\//g, '_');

  if (key === 'completa') {
    return '--ativa';
  }
  if (key === 'aprovado') {
    return '--aprovado';
  }
  if (
    key === 'ativo' ||
    key === 'ativa' ||
    key === 'recebida' ||
    key === 'atendida' ||
    key === 'decidida' ||
    key === 'quitado' ||
    key === 'ok' ||
    key === 'encerrado' ||
    key === 'aju_gerado' ||
    key === 'confrontado' ||
    key === 'contado_1'
  ) {
    return '--ativo';
  }

  if (
    key === 'inativo' ||
    key === 'inativa' ||
    key === 'incompleta' ||
    key === 'pendente' ||
    key === 'pendente_ratificacao' ||
    key === 'em_preparacao' ||
    key === 'enviado_p_aprovacao' ||
    key === 'visualizado' ||
    key === 'aguardando_pagamento' ||
    key === 'aberta' ||
    key === 'aberto' ||
    key === 'parcial' ||
    key === 'rascunho' ||
    key === 'urgente' ||
    key === 'em_contagem' ||
    key === 'divergente' ||
    key === 'recontado' ||
    key === 'aju_pendente' ||
    key === 'a_vencer'
  ) {
    if (key === 'pendente_ratificacao') return '--pendente_ratificacao';
    if (key === 'inativa' || key === 'incompleta') return '--inativo';
    return '--pendente';
  }

  if (
    key === 'bloqueado' ||
    key === 'rejeitado' ||
    key === 'cancelado' ||
    key === 'cancelada' ||
    key === 'vencido'
  ) {
    return '--bloqueado';
  }

  return '--default';
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill${pillVariant(status)}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
