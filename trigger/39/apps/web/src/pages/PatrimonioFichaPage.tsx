import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BemFichaSheet } from '../components/BemFichaSheet';
import { api, type BemPatrimonial } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';
import { brandDocumentTitle } from '../lib/brand';

export function PatrimonioFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [bem, setBem] = useState<BemPatrimonial | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id || id === 'novo') {
      setError('Bem inválido para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: BemPatrimonial }>(`/bens/${id}`);
        if (cancelled) return;
        setBem(res.data);
      } catch {
        if (cancelled) return;
        setError('Bem patrimonial não encontrado.');
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
    if (!bem) return;
    document.title = `Ficha ${bem.codigo} · ${bem.descricao}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [bem]);

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
                id && id !== 'novo' ? `/patrimonio/${id}` : '/patrimonio',
              )
            }
          >
            Voltar ao cadastro
          </button>
          <span className="ficha-toolbar-hint">
            Retrato A4 · use Imprimir ou Salvar como PDF no navegador
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!bem}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {bem && !loading && (
        <BemFichaSheet
          bem={bem}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
