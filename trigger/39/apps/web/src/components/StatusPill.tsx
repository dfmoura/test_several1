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

  if (
    key === 'ativo' ||
    key === 'ativa' ||
    key === 'completa' ||
    key === 'aprovado'
  ) {
    return key === 'completa' ? '--ativa' : `--${key === 'aprovado' ? 'aprovado' : key}`;
  }

  if (
    key === 'inativo' ||
    key === 'inativa' ||
    key === 'incompleta' ||
    key === 'pendente' ||
    key === 'pendente_ratificacao' ||
    key === 'em_preparacao' ||
    key === 'enviado_p_aprovacao' ||
    key === 'visualizado'
  ) {
    if (key === 'pendente_ratificacao') return '--pendente_ratificacao';
    if (key === 'inativa' || key === 'incompleta') return '--inativo';
    return '--pendente';
  }

  if (
    key === 'bloqueado' ||
    key === 'rejeitado' ||
    key === 'cancelado' ||
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
