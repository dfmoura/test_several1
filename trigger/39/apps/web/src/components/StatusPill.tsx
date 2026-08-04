type StatusPillProps = {
  status: string;
};

export function StatusPill({ status }: StatusPillProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const variant =
    normalized === 'ativo' ||
    normalized === 'ativa' ||
    normalized === 'aprovado'
      ? `--${normalized}`
      : normalized === 'inativo' ||
          normalized === 'pendente' ||
          normalized === 'pendente_ratificacao'
        ? `--${normalized === 'pendente_ratificacao' ? 'pendente_ratificacao' : normalized}`
        : normalized === 'bloqueado'
          ? '--bloqueado'
          : '--default';

  return (
    <span className={`status-pill status-pill${variant}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
