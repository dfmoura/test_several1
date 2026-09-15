import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProdutoFichaGerencialSheet } from '../components/ProdutoFichaGerencialSheet';
import { api, type Produto } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import { voltarDaFicha } from '../lib/fichaNav';

export function ProdutoFichaGerencialPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, empresas, empresaId, hasPermission } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);
  const incluirFiscal = hasPermission('produto.fiscal');

  const filtros = useMemo(
    () => ({
      q: searchParams.get('q')?.trim() || undefined,
      familia: searchParams.get('familia')?.trim() || undefined,
      grupo: searchParams.get('grupo')?.trim() || undefined,
    }),
    [searchParams],
  );

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        if (filtros.q) qs.set('q', filtros.q);
        if (filtros.familia) qs.set('familia', filtros.familia);
        if (filtros.grupo) qs.set('grupo', filtros.grupo);
        qs.set('limit', '500');
        const res = await api.get<{ data: Produto[] }>(`/produtos?${qs}`);
        if (cancelled) return;
        setProdutos(res.data);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Falha ao carregar produtos.');
        setProdutos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtros]);

  useEffect(() => {
    document.body.classList.add('ficha-print-mode');
    return () => {
      document.body.classList.remove('ficha-print-mode');
    };
  }, []);

  useEffect(() => {
    document.title = `Ficha gerencial · Produtos · ${empresaNome}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [empresaNome]);

  return (
    <div className="ficha-page ficha-page--landscape">
      <div className="ficha-toolbar ficha-toolbar--landscape no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, '/produtos')}
          >
            Voltar aos produtos
          </button>
          <span className="ficha-toolbar-hint">
            Paisagem A4 · um SKU por linha · use Imprimir ou Salvar como PDF no navegador
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading || produtos.length === 0}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading ficha-loading--landscape">Carregando ficha…</div>}
      {error && !loading && (
        <div className="alert alert-error ficha-error ficha-error--landscape">{error}</div>
      )}
      {!loading && !error && produtos.length === 0 && (
        <div className="alert alert-error ficha-error ficha-error--landscape">
          Nenhum produto no recorte atual.
        </div>
      )}

      {!loading && produtos.length > 0 && (
        <ProdutoFichaGerencialSheet
          produtos={produtos}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
          filtros={filtros}
          incluirFiscal={incluirFiscal}
        />
      )}
    </div>
  );
}
