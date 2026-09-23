import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { OpApontamentoPanel } from '../components/OpApontamentoPanel';
import { api, type OrdemProducao } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { opStatusLabel } from '../lib/producaoUi';

/**
 * Porta do chão: receber na máquina, apontar e concluir.
 * O resultado depois de CONCLUIDA fica na OP (embalagem).
 */
export function ProducaoApontamentoChaoPage() {
  const { id } = useParams();
  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: OrdemProducao }>(`/ordens-producao/apontamentos/${id}`);
      setOp(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao abrir o apontamento.');
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
        title={op ? `Apontamento · ${op.codigo}` : 'Apontamento'}
        description="A produção recebe o material, aponta o processo e conclui a OP. PCP lê o resultado na ordem."
        actions={
          <>
            <Link className="btn btn-secondary" to="/ordens-producao/apontamentos">
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
                <span>Planejada</span>
                <strong>{formatDecimalBr(Number(op.qtde_planejada), 0)}</strong>
              </div>
              <div>
                <span>Tolerância</span>
                <strong>±{op.pedido?.tolerancia_qtd_pct ?? '20'}%</strong>
              </div>
            </div>
          </div>
          <OpApontamentoPanel op={op} onOp={setOp} />
        </>
      ) : null}
    </div>
  );
}
