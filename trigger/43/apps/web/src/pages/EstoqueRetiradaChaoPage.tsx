import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { OpKitPainel } from '../components/OpKitPainel';
import { api, type OrdemProducao } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';

/**
 * Porta do estoque: o físico que sai da prateleira.
 * Happy path = Confirmar saída sugerida. Overlay = outro volume / devolver.
 */
export function EstoqueRetiradaChaoPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [params] = useSearchParams();
  const materialInicialId = Number(params.get('material_id') || 0) || undefined;
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
      setErr(e instanceof Error ? e.message : 'Falha ao abrir a lista.');
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
        {op ? (
          <a
            className="btn btn-secondary btn-sm"
            href={`/estoque/retiradas/${op.id}/ficha`}
            onClick={(e) => onAbrirFichaClick(e, `/estoque/retiradas/${op.id}/ficha`)}
          >
            Ficha para o estoque
          </a>
        ) : null}
        {op ? <span className="pick-toolbar__ref">{op.codigo}</span> : null}
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando…</p> : null}

      {op ? (
        <OpKitPainel
          op={op}
          pedido={null}
          porta="chao"
          podeEstoque={hasPermission('estoque.ler')}
          podeProducao={false}
          canWrite={hasPermission('estoque.escrever')}
          materialInicialId={materialInicialId}
          onOp={setOp}
        />
      ) : null}
    </div>
  );
}
