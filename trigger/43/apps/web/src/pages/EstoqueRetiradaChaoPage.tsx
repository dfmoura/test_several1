import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { OpFichaRetirada } from '../components/OpFichaRetirada';
import { OpPickTicket } from '../components/OpPickTicket';
import { api, type OrdemProducao } from '../lib/api';
import { useAuth } from '../lib/auth';

/**
 * Porta do almoxarifado: confronta a requisição com o físico (QR ou manual).
 * A ficha anexada à OP é o mesmo DTO.
 */
export function EstoqueRetiradaChaoPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [params] = useSearchParams();
  const pedido = {
    materialId: Number(params.get('material_id') || 0) || undefined,
    produtoId: Number(params.get('produto_id') || 0) || undefined,
    qtde: params.get('qtde') || undefined,
  };
  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: OrdemProducao }>(`/estoque/retiradas/${id}`);
      setOp(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao abrir a lista de retirada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="page">
      <div className="pick-toolbar">
        <Link className="btn btn-secondary btn-sm" to="/estoque/retiradas">
          Fila
        </Link>
        {op ? <span className="pick-toolbar__ref">{op.codigo}</span> : null}
        {op ? (
          <Link className="btn btn-secondary btn-sm" to={`/ordens-producao/${op.id}`}>
            Voltar à lista
          </Link>
        ) : null}
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando…</p> : null}

      {op ? (
        <>
          <OpPickTicket
            op={op}
            pedido={null}
            podeEstoque={hasPermission('estoque.ler') || hasPermission('producao.ler')}
            podeProducao={hasPermission('producao.ler')}
            porta="chao"
          />
          <OpFichaRetirada op={op} mode="chao" onOp={setOp} pedido={pedido} hideResumo />
        </>
      ) : null}
    </div>
  );
}
