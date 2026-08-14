import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PedidoFichaSheet } from '../components/PedidoFichaSheet';
import { api, type Pedido } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';
import { brandDocumentTitle } from '../lib/brand';

export function PedidoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id) {
      setError('Pedido inválido para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Pedido }>(`/pedidos/${id}`);
        if (cancelled) return;
        setPedido(res.data);
      } catch {
        if (cancelled) return;
        setError('Pedido não encontrado.');
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
    if (!pedido) return;
    document.title = `Ficha ${pedido.codigo} · ${pedido.parceiro?.razao_social ?? 'Pedido'}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [pedido]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, id ? `/pedidos/${id}` : '/pedidos')}
          >
            Voltar ao pedido
          </button>
          <span className="ficha-toolbar-hint">
            Retrato A4 · uso interno (sem preço) · Imprimir ou Salvar como PDF
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!pedido}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {pedido && !loading && (
        <PedidoFichaSheet
          pedido={pedido}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
