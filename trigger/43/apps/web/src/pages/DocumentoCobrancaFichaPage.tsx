import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DocumentoCobrancaFichaSheet } from '../components/DocumentoCobrancaFichaSheet';
import { api, type Faturamento, type Titulo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import { voltarDaFicha } from '../lib/fichaNav';

export function DocumentoCobrancaFichaPage() {
  const { id, tituloId } = useParams<{ id: string; tituloId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fat, setFat] = useState<Faturamento | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const titulo: Titulo | undefined = useMemo(() => {
    if (!fat || !tituloId) return undefined;
    return (fat.titulos ?? []).find((t) => String(t.id) === String(tituloId));
  }, [fat, tituloId]);

  useEffect(() => {
    if (!id) {
      setError('Faturamento inválido para cobrança.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Faturamento }>(`/faturamentos/${id}`);
        if (cancelled) return;
        setFat(res.data);
      } catch {
        if (cancelled) return;
        setError('Faturamento não encontrado.');
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
    if (!fat || !titulo) return;
    document.title = `Cobrança ${titulo.codigo} · ${fat.codigo}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [fat, titulo]);

  const voltarPath = id ? `/financeiro/faturamentos/${id}` : '/financeiro/faturamentos';

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, voltarPath)}
          >
            Voltar ao faturamento
          </button>
          <span className="ficha-toolbar-hint">
            Documento de cobrança · A4 · Imprimir ou Salvar como PDF — não é DANFE
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!titulo}
          onClick={() => window.print()}
        >
          Imprimir cobrança
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando cobrança…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}
      {!loading && !error && fat && !titulo ? (
        <div className="alert alert-error ficha-error">
          Título não encontrado neste faturamento.
        </div>
      ) : null}

      {fat && titulo && !loading ? (
        <DocumentoCobrancaFichaSheet
          fat={fat}
          titulo={titulo}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      ) : null}
    </div>
  );
}
