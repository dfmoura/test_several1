import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EntregaFichaSheet } from '../components/EntregaFichaSheet';
import { api, type Entrega } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';
import { brandDocumentTitle } from '../lib/brand';

export function EntregaFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id) {
      setError('Entrega inválida para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Entrega }>(`/entregas/${id}`);
        if (cancelled) return;
        setEntrega(res.data);
      } catch {
        if (cancelled) return;
        setError('Romaneio não encontrado.');
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
    if (!entrega) return;
    document.title = `${entrega.codigo} · ${entrega.parceiro?.razao_social ?? 'Entrega'}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [entrega]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, id ? `/expedicao/${id}` : '/expedicao')}
          >
            Voltar à entrega
          </button>
          <span className="ficha-toolbar-hint">Retrato A4 · romaneio / canhoto · Imprimir ou Salvar como PDF</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!entrega}
          onClick={() => window.print()}
        >
          Imprimir
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {entrega && !loading && (
        <EntregaFichaSheet
          entrega={entrega}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
