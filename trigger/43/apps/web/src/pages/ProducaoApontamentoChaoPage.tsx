import { Navigate, useParams } from 'react-router-dom';

/** Atalho antigo. O fecho vive na ordem de produção. */
export function ProducaoApontamentoChaoPage() {
  const { id } = useParams();
  return <Navigate to={id ? `/ordens-producao/${id}` : '/ordens-producao'} replace />;
}
