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
    key === 'contado_1' ||
    key === 'liberado' ||
    key === 'produzido' ||
    key === 'faturado' ||
    key === 'concluida' ||
    key === 'concluido' ||
    key === 'requisitado' ||
    key === 'em_dia' ||
    key === 'paga' ||
    key === 'vigente' ||
    key === 'cortesia' ||
    key === 'disponivel' ||
    key === 'amarrada' ||
    key === 'cadastrado'
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
    key === 'a_vencer' ||
    key === 'ainda_nao_valido' ||
    key === 'em_producao' ||
    key === 'em_andamento' ||
    key === 'planejada' ||
    key === 'nf_pendente' ||
    key === 'suspensa' ||
    key === 'nova' ||
    key === 'sem_papel' ||
    key === 'nao_cadastrado'
  ) {
    if (key === 'pendente_ratificacao') return '--pendente_ratificacao';
    if (key === 'inativa' || key === 'incompleta') return '--inativo';
    if (key === 'suspensa') return '--bloqueado';
    return '--pendente';
  }

  if (
    key === 'bloqueado' ||
    key === 'rejeitado' ||
    key === 'cancelado' ||
    key === 'cancelada' ||
    key === 'estornado' ||
    key === 'estornada' ||
    key === 'vencido' ||
    key === 'sem_interesse'
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
