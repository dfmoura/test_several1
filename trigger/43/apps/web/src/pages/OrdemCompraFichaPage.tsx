import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrdemCompraFichaSheet } from '../components/OrdemCompraFichaSheet';
import { api, type OrdemCompra } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import { voltarDaFicha } from '../lib/fichaNav';

export function OrdemCompraFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [oc, setOc] = useState<OrdemCompra | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'Empresa';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id) {
      setError('OC inválida para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: OrdemCompra }>(`/ordens-compra/${id}`);
        if (cancelled) return;
        setOc(res.data);
      } catch {
        if (cancelled) return;
        setError('Ordem de compra não encontrada.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    document.body.classList.add('ficha-print-mode');
    return () => {
      document.body.classList.remove('ficha-print-mode');
    };
  }, []);

  useEffect(() => {
    if (!oc) return;
    document.title = `Pedido de compra ${oc.codigo} · ${oc.fornecedor?.razao_social ?? 'OC'}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [oc]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              voltarDaFicha(navigate, id ? `/compras/ordens/${id}` : '/compras/ordens')
            }
          >
            Voltar à OC
          </button>
          <span className="ficha-toolbar-hint">
            Retrato A4 · pedido de compra ao fornecedor · Imprimir ou Salvar como PDF
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!oc}
          onClick={() => window.print()}
        >
          Imprimir / PDF
        </button>
      </div>

      {loading ? <div className="loading">Carregando ficha…</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      {oc ? (
        <OrdemCompraFichaSheet
          oc={oc}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? 'Usuário'}
          emitidoEm={emitidoEm}
        />
      ) : null}
    </div>
  );
}
