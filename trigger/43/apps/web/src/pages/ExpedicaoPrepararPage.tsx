import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExpedicaoLacunas } from '../components/ExpedicaoLacunas';
import { ExpedicaoPedidoPanel } from '../components/ExpedicaoPedidoPanel';
import { PageHeader } from '../components/PageHeader';
import { api, type EntregaPreview } from '../lib/api';
import { entregaVigente, modoEntregaLabel } from '../lib/expedicaoUi';

/**
 * Porta do chão da expedição: só o que falta + Expedição e entrega.
 * Sem PED completo. Motor = entrega-preview.
 */
export function ExpedicaoPrepararPage() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<EntregaPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const load = async () => {
    if (!pedidoId) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get<{ data: EntregaPreview }>(`/pedidos/${pedidoId}/entrega-preview`);
      const data = res.data;
      if (data.entrega?.id && entregaVigente(data.entrega.status)) {
        navigate(`/expedicao/${data.entrega.id}`, { replace: true });
        return;
      }
      setPreview(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao abrir a preparação.');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  const codigo = preview?.pedido?.codigo ?? 'Pedido';
  const status = preview?.pedido?.status ?? '';

  return (
    <>
      <PageHeader
        title={preview ? `Expedição · ${codigo}` : 'Expedição'}
        description={
          preview
            ? `${preview.parceiro?.razao_social ?? '—'} · ${modoEntregaLabel(preview.modo)}`
            : loading
              ? 'Carregando…'
              : 'Pedido não encontrado na expedição.'
        }
        actions={
          <div className="btn-row">
            <Link to="/expedicao" className="btn btn-secondary">
              Fila
            </Link>
            {preview?.pedido?.id ? (
              <Link to={`/pedidos/${preview.pedido.id}`} className="btn btn-secondary">
                {codigo}
              </Link>
            ) : null}
          </div>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      {loading ? <div className="loading">Carregando…</div> : null}

      {!loading && preview && pedidoId ? (
        <>
          <ExpedicaoLacunas preview={preview} />
          <ExpedicaoPedidoPanel
            pedidoId={Number(pedidoId)}
            pedidoCodigo={codigo}
            pedidoStatus={status || 'FATURADO'}
            variant="ficha"
            onChanged={() => void load()}
            onExpedido={(ent) => navigate(`/expedicao/${ent.id}`)}
          />
        </>
      ) : null}
    </>
  );
}
