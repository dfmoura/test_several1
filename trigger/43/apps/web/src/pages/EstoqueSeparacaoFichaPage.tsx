import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EstoqueSeparacaoFichaSheet } from '../components/EstoqueSeparacaoFichaSheet';
import { api, type EstoqueSeparacaoDetalhe } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import { voltarDaFicha } from '../lib/fichaNav';

function marcadosDaQuery(raw: string | null): Array<{ lote_id: number; qtde: string }> | undefined {
  if (!raw) return undefined;
  const linhas = raw
    .split(',')
    .map((parte) => {
      const [id, qtde] = parte.split(':');
      const loteId = Number(id);
      if (!Number.isFinite(loteId) || loteId <= 0 || !qtde) return null;
      return { lote_id: loteId, qtde };
    })
    .filter((l): l is { lote_id: number; qtde: string } => l !== null);
  return linhas.length > 0 ? linhas : undefined;
}

export function EstoqueSeparacaoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [detalhe, setDetalhe] = useState<EstoqueSeparacaoDetalhe | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);
  const marcados = useMemo(() => marcadosDaQuery(params.get('m')), [params]);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'Empresa';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id) {
      setError('Separação inválida para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: EstoqueSeparacaoDetalhe }>(`/estoque/separacoes/${id}`);
        if (!cancelled) setDetalhe(res.data);
      } catch {
        if (!cancelled) setError('Separação não encontrada.');
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
    if (!detalhe) return;
    document.title = `Separação ${detalhe.pedido_codigo ?? detalhe.pedido_item_id}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [detalhe]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, id ? `/estoque/separacoes/${id}` : '/estoque/separacoes')}
          >
            Voltar à separação
          </button>
          <span className="ficha-toolbar-hint">
            Folha do estoque · revenda · retrato A4 · sem preço · saldo sai na NF-e
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!detalhe}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {detalhe && !loading && (
        <EstoqueSeparacaoFichaSheet
          detalhe={detalhe}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
          marcados={marcados}
        />
      )}
    </div>
  );
}
