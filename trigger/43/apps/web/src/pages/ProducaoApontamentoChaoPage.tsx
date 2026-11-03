import { Navigate, useParams } from 'react-router-dom';

/** Atalho antigo. O fecho vive em /ordens-producao/:id/fechar. */
export function ProducaoApontamentoChaoPage() {
  const { id } = useParams();
  return (
    <Navigate to={id ? `/ordens-producao/${id}/fechar` : '/ordens-producao/a-fechar'} replace />
  );
}
