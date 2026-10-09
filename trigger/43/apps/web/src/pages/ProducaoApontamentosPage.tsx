import { Navigate } from 'react-router-dom';

/** Atalho antigo. O fecho vive na ordem de produção. */
export function ProducaoApontamentosPage() {
  return <Navigate to="/ordens-producao" replace />;
}
