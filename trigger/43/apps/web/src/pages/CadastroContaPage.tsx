import { Navigate } from 'react-router-dom';

/** Alta pública de conta desativada — acesso só via admin master (/usuarios) ou CLI. */
export function CadastroContaPage() {
  return <Navigate to="/login" replace />;
}
