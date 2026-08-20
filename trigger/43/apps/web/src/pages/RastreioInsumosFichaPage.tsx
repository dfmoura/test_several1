import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RastreioInsumosFichaSheet } from '../components/RastreioInsumosFichaSheet';
import { api, type RastreioDocumento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import { voltarDaFicha } from '../lib/fichaNav';

type Kind = 'op' | 'pedido' | 'lote';

export function RastreioInsumosFichaPage({ kind }: { kind: Kind }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [doc, setDoc] = useState<RastreioDocumento | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  const voltarPath =
    kind === 'op'
      ? id
        ? `/ordens-producao/${id}`
        : '/rastreio'
      : kind === 'pedido'
        ? id
          ? `/pedidos/${id}`
          : '/rastreio'
        : '/rastreio';

  useEffect(() => {
    if (!id) {
      setError('Documento inválido para rastreio.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const path =
      kind === 'op'
        ? `/rastreio/ordens-producao/${id}`
        : kind === 'pedido'
          ? `/rastreio/pedidos/${id}`
          : `/rastreio/lotes/${id}`;
    void (async () => {
      try {
        const res = await api.get<{ data: RastreioDocumento }>(path);
        if (cancelled) return;
        setDoc(res.data);
      } catch {
        if (cancelled) return;
        setError('Rastreio não encontrado.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  useEffect(() => {
    document.body.classList.add('ficha-print-mode');
    return () => {
      document.body.classList.remove('ficha-print-mode');
    };
  }, []);

  useEffect(() => {
    if (!doc) return;
    const code = doc.op?.codigo ?? doc.pedido?.codigo ?? doc.lote?.codigo ?? 'rastreio';
    document.title = `Rastreio ${code}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [doc]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, voltarPath)}
          >
            Voltar
          </button>
          <span className="ficha-toolbar-hint">
            Retrato A4 · genealogia lote / NF / fornecedor · Imprimir ou Salvar como PDF
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!doc}
          onClick={() => window.print()}
        >
          Imprimir rastreio
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando rastreio…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {doc && !loading && (
        <RastreioInsumosFichaSheet
          rastreio={doc}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
