import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PedidoConfirmacaoSheet } from '../components/PedidoConfirmacaoSheet';
import { api, type Pedido } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import { prepFichaPrint, useFichaPrintPrep, voltarDaFicha } from '../lib/fichaNav';

/**
 * Confirmação comercial do PED — aba satélite A4 retrato (documento ao cliente).
 * Não substitui a ficha operacional (`/pedidos/:id/ficha`).
 */
export function PedidoConfirmacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  useFichaPrintPrep();

  const empresaNome = useMemo(() => {
    if (pedido?.empresa) {
      return (
        pedido.empresa.nome_fantasia ||
        pedido.empresa.razao_social ||
        nomeEmpresaDoContexto(empresas, empresaId)
      );
    }
    return nomeEmpresaDoContexto(empresas, empresaId);
  }, [pedido, empresas, empresaId]);

  useEffect(() => {
    if (!id) {
      setError('Pedido inválido para confirmação.');
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
    document.title = `Confirmação ${pedido.codigo} · ${pedido.parceiro?.razao_social ?? 'Pedido'}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [pedido]);

  return (
    <div className="ficha-page ficha-page-proposta">
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
            A4 retrato · confirmação comercial ao cliente · Imprimir ou Salvar como PDF
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!pedido}
          onClick={() => {
            prepFichaPrint();
            window.print();
          }}
        >
          Imprimir confirmação
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando confirmação…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {pedido && !loading ? (
        <PedidoConfirmacaoSheet
          pedido={pedido}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      ) : null}
    </div>
  );
}

function nomeEmpresaDoContexto(
  empresas: Array<{ id: number; razao_social?: string | null; nome_fantasia?: string | null }>,
  empresaId: number | null,
): string {
  const emp = empresas.find((e) => e.id === empresaId);
  return emp?.nome_fantasia || emp?.razao_social || 'FLEXOERP';
}
