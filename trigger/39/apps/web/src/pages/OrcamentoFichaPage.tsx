import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrcamentoFichaSheet } from '../components/OrcamentoFichaSheet';
import { api, type Orcamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';

export function OrcamentoFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id || id === 'novo') {
      setError('Orçamento inválido para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Orcamento }>(`/orcamentos/${id}`);
        if (cancelled) return;
        setOrcamento(res.data);
      } catch {
        if (cancelled) return;
        setError('Orçamento não encontrado.');
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
    if (!orcamento) return;
    document.title = `Cálculo ${orcamento.codigo} · ${orcamento.cliente_nome}`;
    return () => {
      document.title = 'ERP RLP';
    };
  }, [orcamento]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              voltarDaFicha(
                navigate,
                id && id !== 'novo' ? `/orcamentos/${id}` : '/orcamentos',
              )
            }
          >
            Voltar ao orçamento
          </button>
          <span className="ficha-toolbar-hint">
            A4 paisagem · uso interno (cálculo completo) · Imprimir ou Salvar como PDF
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!orcamento}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {orcamento && !loading && (
        <OrcamentoFichaSheet
          orcamento={orcamento}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
