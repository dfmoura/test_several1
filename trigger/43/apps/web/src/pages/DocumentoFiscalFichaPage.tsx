import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DocumentoFiscalFichaSheet } from '../components/DocumentoFiscalFichaSheet';
import { api, type DocumentoFiscalSaida, type Faturamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';
import { brandDocumentTitle } from '../lib/brand';

export function DocumentoFiscalFichaPage() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [fat, setFat] = useState<Faturamento | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  const doc: DocumentoFiscalSaida | undefined = useMemo(() => {
    if (!fat || !docId) return undefined;
    return (fat.documentos_fiscais ?? []).find((d) => String(d.id) === String(docId));
  }, [fat, docId]);

  useEffect(() => {
    if (!id) {
      setError('Faturamento inválido para ficha.');
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
    if (!fat || !doc) return;
    const tipo = doc.tipo === 'NFSE' ? 'NFS-e' : 'NF-e';
    document.title = `Prévia ${tipo} ${doc.codigo} · ${fat.codigo}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [fat, doc]);

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
            {doc?.tipo === 'NFSE' ? 'Prévia da NFS-e' : 'Prévia da NF-e (DANFE)'} · A4 · Imprimir ou
            Salvar como PDF — sem valor fiscal até o hub autorizar
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!doc}
          onClick={() => window.print()}
        >
          Imprimir nota
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando nota…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}
      {!loading && !error && fat && !doc ? (
        <div className="alert alert-error ficha-error">
          Documento fiscal não encontrado neste faturamento.
        </div>
      ) : null}

      {fat && doc && !loading ? (
        <DocumentoFiscalFichaSheet
          fat={fat}
          doc={doc}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      ) : null}
    </div>
  );
}
