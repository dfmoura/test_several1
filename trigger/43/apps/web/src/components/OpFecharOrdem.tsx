import { Link } from 'react-router-dom';
import type { OrdemProducao } from '../lib/api';

type Props = {
  op: OrdemProducao;
  canWrite: boolean;
};

/**
 * Porta do fecho na ficha da OP — satélite /fechar (boas/refugo por modelo).
 * ADR_PRODUCAO_APONTAMENTO emenda 2026-11-03.
 */
export function OpFecharOrdem({ op, canWrite }: Props) {
  const aberta = ['ABERTA', 'EM_ANDAMENTO'].includes(op.status);
  const pode = op.pode_fechar ?? (op.materiais ?? []).some((m) => !m.pendente);

  if (!aberta || !pode) {
    return null;
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section">
          <h3>Fechar a ordem</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Informe as etiquetas boas e o refugo de cada modelo. O que ainda está fora da
            prateleira entra como usado — sobra volta em Estoque, antes de fechar.
          </p>
        </div>

        {canWrite ? (
          <div className="btn-row" style={{ marginTop: '0.25rem' }}>
            <Link to={`/ordens-producao/${op.id}/fechar`} className="btn btn-primary">
              Fechar a ordem
            </Link>
            {op.pedido ? (
              <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-secondary">
                {op.pedido.codigo}
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="muted" style={{ margin: '0.5rem 0 0' }}>
            Quem fecha a ordem precisa de permissão para gravar a produção.
          </p>
        )}
      </div>
    </div>
  );
}
