import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProdutoFichaSheet } from '../components/ProdutoFichaSheet';
import { api, type Produto } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';

export function ProdutoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id || id === 'novo') {
      setError('Produto inválido para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Produto }>(`/produtos/${id}`);
        if (cancelled) return;
        setProduto(res.data);
      } catch {
        if (cancelled) return;
        setError('Produto não encontrado.');
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
    if (!produto) return;
    document.title = `Ficha ${produto.codigo} · ${produto.descricao_fiscal}`;
    return () => {
      document.title = 'ERP RLP';
    };
  }, [produto]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              voltarDaFicha(navigate, id && id !== 'novo' ? `/produtos/${id}` : '/produtos')
            }
          >
            Voltar ao cadastro
          </button>
          <span className="ficha-toolbar-hint">Retrato A4 · use Imprimir ou Salvar como PDF no navegador</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!produto}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {produto && !loading && (
        <ProdutoFichaSheet
          produto={produto}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
