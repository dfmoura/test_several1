import { Link, useLocation } from 'react-router-dom';
import { resolveVoltar } from '../lib/navReturn';

type VoltarLinkProps = {
  /** Casa canônica do módulo quando não há provenance. */
  fallback: string;
  fallbackLabel?: string;
  className?: string;
};

/**
 * Botão Voltar semântico: lê returnTo do location.state se válido;
 * senão cai no fallback. Visual idêntico ao Link btn-secondary existente.
 */
export function VoltarLink({
  fallback,
  fallbackLabel = 'Voltar',
  className = 'btn btn-secondary',
}: VoltarLinkProps) {
  const location = useLocation();
  const { to, label } = resolveVoltar(fallback, location.state, fallbackLabel);

  return (
    <Link to={to} className={className}>
      {label}
    </Link>
  );
}
