import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type Pedido } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDecimalBr } from '../lib/format';

export function PedidoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: Pedido }>(`/pedidos/${id}`);
      setPedido(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar pedido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const abrirOrdem = async (itemId: number, necessidade: string) => {
    if (!pedido) return;
    setBusy(true);
    setErr(null);
    try {
      const path =
        necessidade === 'SERVICO'
          ? `/pedidos/${pedido.id}/abrir-os`
          : `/pedidos/${pedido.id}/abrir-op`;
      const res = await api.post<{ data: { id: number; codigo: string } }>(path, {
        pedido_item_id: itemId,
      });
      if (necessidade === 'SERVICO') {
        navigate(`/ordens-servico/${res.data.id}`);
      } else {
        navigate(`/ordens-producao/${res.data.id}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível abrir a ordem.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading">Carregando…</div>;
  if (!pedido) return <div className="empty">{err ?? 'Pedido não encontrado.'}</div>;

  const readeq = (pedido.snapshot as { readequacao?: Record<string, unknown> } | null)?.readequacao;

  return (
    <>
      <PageHeader
        title={pedido.codigo}
        description={`${pedido.parceiro?.razao_social ?? '—'} · ORC ${pedido.orcamento?.codigo ?? '—'} · tolerância ±${pedido.tolerancia_qtd_pct}%`}
        actions={
          <Link to="/pedidos" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {err && <div className="alert alert-error">{err}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div className="muted">Status</div>
            <StatusPill status={pedido.status} />
          </div>
          <div>
            <div className="muted">Prazo</div>
            <strong>{pedido.prazo_entrega_dias ?? '—'} d.úteis</strong>
          </div>
          {readeq && (
            <div>
              <div className="muted">Readequação</div>
              <strong>
                {String(readeq.qtde_pedida)} →{' '}
                {String(readeq.qtde_boa ?? readeq.qtde_executada ?? '—')}
              </strong>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Itens</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Necessidade</th>
                  <th>Pedida</th>
                  <th>Produzida</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pedido.itens.map((item) => {
                  const opAtiva = pedido.ordens_producao?.find(
                    (o) =>
                      o.status !== 'CANCELADA' &&
                      (o.pedido_item_id == null || o.pedido_item_id === item.id),
                  );
                  const osAtiva = pedido.ordens_servico?.find(
                    (o) =>
                      o.status !== 'CANCELADA' &&
                      (o.pedido_item_id == null || o.pedido_item_id === item.id),
                  );
                  return (
                    <tr key={item.id}>
                      <td>{item.descricao}</td>
                      <td>{item.necessidade}</td>
                      <td>
                        {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
                      </td>
                      <td>{formatDecimalBr(Number(item.qtde_produzida), 0)}</td>
                      <td>
                        <StatusPill status={item.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.necessidade === 'PRODUCAO' && opAtiva && (
                          <Link to={`/ordens-producao/${opAtiva.id}`} className="btn btn-secondary">
                            {opAtiva.codigo}
                          </Link>
                        )}
                        {item.necessidade === 'SERVICO' && osAtiva && (
                          <Link to={`/ordens-servico/${osAtiva.id}`} className="btn btn-secondary">
                            {osAtiva.codigo}
                          </Link>
                        )}
                        {hasPermission('producao.escrever') &&
                          ['LIBERADO', 'EM_PRODUCAO'].includes(pedido.status) &&
                          item.status === 'PENDENTE' &&
                          item.necessidade !== 'REVENDA' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() => void abrirOrdem(item.id, item.necessidade)}
                            >
                              {item.necessidade === 'SERVICO' ? 'Abrir OS' : 'Abrir OP'}
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
