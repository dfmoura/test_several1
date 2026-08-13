import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDecimalBr } from '../lib/format';

type OrdemServico = {
  id: number;
  codigo: string;
  status: string;
  qtde_planejada: string;
  qtde_executada: string | null;
  fora_tolerancia: boolean;
  pedido?: { id: number; codigo: string; status: string } | null;
  pedido_item?: { id: number; descricao: string; necessidade: string } | null;
};

export function OrdemServicoDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qtde, setQtde] = useState('');
  const [aceitarFora, setAceitarFora] = useState(false);
  const [motivoFora, setMotivoFora] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: OrdemServico }>(`/ordens-servico/${id}`);
      setOs(res.data);
      setQtde(res.data.qtde_executada ?? res.data.qtde_planejada);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar OS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const concluir = async () => {
    if (!os) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ data: OrdemServico }>(`/ordens-servico/${os.id}/concluir`, {
        qtde_executada: qtde,
        aceitar_fora_tolerancia: aceitarFora,
        motivo_fora_tolerancia: motivoFora || null,
      });
      setOs(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao concluir.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading">Carregando…</div>;
  if (!os) return <div className="empty">{err ?? 'OS não encontrada.'}</div>;

  const aberta = ['ABERTA', 'EM_ANDAMENTO'].includes(os.status);

  return (
    <>
      <PageHeader
        title={os.codigo}
        description={os.pedido_item?.descricao ?? 'Ordem de serviço'}
        actions={
          <Link to="/pedidos" className="btn btn-secondary">
            Pedidos
          </Link>
        }
      />
      {err && <div className="alert alert-error">{err}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div className="muted">Status</div>
            <StatusPill status={os.status} />
          </div>
          <div>
            <div className="muted">Planejada</div>
            <strong>{formatDecimalBr(Number(os.qtde_planejada), 0)}</strong>
          </div>
          {os.pedido && (
            <div>
              <Link to={`/pedidos/${os.pedido.id}`}>{os.pedido.codigo}</Link>
            </div>
          )}
        </div>
      </div>

      {aberta && hasPermission('producao.escrever') && (
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Concluir serviço</h3>
            <div className="form-group">
              <label>Qtde executada</label>
              <input value={qtde} onChange={(e) => setQtde(e.target.value)} />
            </div>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={aceitarFora}
                onChange={(e) => setAceitarFora(e.target.checked)}
              />
              Aceitar fora da tolerância
            </label>
            {aceitarFora && (
              <div className="form-group">
                <label>Motivo</label>
                <input value={motivoFora} onChange={(e) => setMotivoFora(e.target.value)} />
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void concluir()}
              style={{ marginTop: '1rem' }}
            >
              Concluir OS
            </button>
          </div>
        </div>
      )}
    </>
  );
}
