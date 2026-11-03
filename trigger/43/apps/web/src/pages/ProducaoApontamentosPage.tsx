import { Navigate } from 'react-router-dom';

/** Atalho antigo “Na máquina” / apontamentos → fila A fechar. */
export function ProducaoApontamentosPage() {
  return <Navigate to="/ordens-producao/a-fechar" replace />;
}
