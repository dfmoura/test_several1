import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { StatusPill } from '../components/StatusPill';
import { OpFichaRetirada } from '../components/OpFichaRetirada';
import { api, type OrdemProducao } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { opStatusLabel } from '../lib/producaoUi';

/**
 * Porta do almoxarifado: confronta a requisição com o físico (QR ou manual).
 * A ficha anexada à OP é o mesmo DTO.
 */
export function EstoqueRetiradaChaoPage() {
  const { id } = useParams();
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
      setErr(e instanceof Error ? e.message : 'Falha ao abrir a requisição.');
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
      <PageHeader
        title={op ? `Requisição · ${op.codigo}` : 'Requisição'}
        description="O estoque vê o pedido, baixa pelo QR ou na mão, e a ficha do que saiu fica na OP."
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque/retiradas">
              Fila
            </Link>
            {op ? (
              <Link className="btn btn-secondary" to={`/ordens-producao/${op.id}`}>
                Ordem de produção
              </Link>
            ) : null}
          </>
        }
      />
      <EstoqueModuleNav />

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {loading ? <p className="muted">Carregando…</p> : null}

      {op ? (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body detail-meta">
              <div>
                <span>Pedido</span>
                <strong>{op.pedido?.codigo ?? '—'}</strong>
              </div>
              <div>
                <span>Cliente</span>
                <strong>{op.parceiro?.razao_social ?? '—'}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>
                  <StatusPill status={opStatusLabel(op.status)} />
                </strong>
              </div>
              <div>
                <span>Ciclos na ficha</span>
                <strong>{op.ficha_retirada?.ciclos.length ?? 0}</strong>
              </div>
              <div>
                <span>A retirar</span>
                <strong>
                  {formatDecimalBr(
                    (op.ficha_retirada?.linhas ?? []).filter((l) => l.pendente).length,
                    0,
                  )}{' '}
                  SKU
                </strong>
              </div>
            </div>
          </div>
          <OpFichaRetirada op={op} mode="chao" onOp={setOp} pedido={pedido} />
        </>
      ) : null}
    </div>
  );
}
