import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EstoqueRetiradaFichaSheet } from '../components/EstoqueRetiradaFichaSheet';
import { api, type OrdemProducao } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import { voltarDaFicha } from '../lib/fichaNav';

export function EstoqueRetiradaFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'Empresa';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id) {
      setError('Retirada inválida para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: OrdemProducao }>(`/estoque/retiradas/${id}`);
        if (!cancelled) setOp(res.data);
      } catch {
        if (!cancelled) setError('Lista de retirada não encontrada.');
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
    if (!op) return;
    document.title = `Retirada ${op.codigo}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [op]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, id ? `/estoque/retiradas/${id}` : '/estoque/retiradas')}
          >
            Voltar à lista
          </button>
          <span className="ficha-toolbar-hint">
            Folha do estoque · o que pegar e onde · retrato A4 · sem preço
          </span>
        </div>
        <button type="button" className="btn btn-primary" disabled={!op} onClick={() => window.print()}>
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {op && !loading && (
        <EstoqueRetiradaFichaSheet
          op={op}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
