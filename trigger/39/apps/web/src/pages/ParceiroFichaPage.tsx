import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ParceiroFichaSheet } from '../components/ParceiroFichaSheet';
import { api, type Parceiro } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';

export function ParceiroFichaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId, hasPermission } = useAuth();
  const [parceiro, setParceiro] = useState<Parceiro | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const showBancario = hasPermission('parceiro.bancario');
  const showCredito = hasPermission('credito.escrever');

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id || id === 'novo') {
      setError('Parceiro inválido para ficha.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Parceiro }>(`/parceiros/${id}`);
        if (cancelled) return;
        setParceiro(res.data);
      } catch {
        if (cancelled) return;
        setError('Parceiro não encontrado.');
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
    if (!parceiro) return;
    document.title = `Ficha ${parceiro.codigo} · ${parceiro.razao_social}`;
    return () => {
      document.title = 'ERP RLP';
    };
  }, [parceiro]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              voltarDaFicha(navigate, id && id !== 'novo' ? `/parceiros/${id}` : '/parceiros')
            }
          >
            Voltar ao cadastro
          </button>
          <span className="ficha-toolbar-hint">Retrato A4 · use Imprimir ou Salvar como PDF no navegador</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!parceiro}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {parceiro && !loading && (
        <ParceiroFichaSheet
          parceiro={parceiro}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
          showBancario={showBancario}
          showCredito={showCredito}
        />
      )}
    </div>
  );
}
