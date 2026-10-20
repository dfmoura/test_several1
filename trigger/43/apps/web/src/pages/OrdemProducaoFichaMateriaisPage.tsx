import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrdemProducaoFichaMateriaisSheet } from '../components/OrdemProducaoFichaMateriaisSheet';
import { api, type OrdemProducao, type Pedido } from '../lib/api';
import { useAuth } from '../lib/auth';
import { voltarDaFicha } from '../lib/fichaNav';
import { brandDocumentTitle } from '../lib/brand';
import { podeVerFichaMateriais } from '../lib/opFichaMateriais';

export function OrdemProducaoFichaMateriaisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, empresas, empresaId } = useAuth();
  const [ordem, setOrdem] = useState<OrdemProducao | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const empresaNome = useMemo(() => {
    const emp = empresas.find((e) => e.id === empresaId);
    return emp?.razao_social ?? emp?.nome_fantasia ?? 'RLP Etiquetas';
  }, [empresas, empresaId]);

  useEffect(() => {
    if (!id) {
      setError('Ordem inválida para ficha de materiais.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: OrdemProducao }>(`/ordens-producao/${id}`);
        if (cancelled) return;
        setOrdem(res.data);
        if (res.data.pedido?.id) {
          try {
            const ped = await api.get<{ data: Pedido }>(`/pedidos/${res.data.pedido.id}`);
            if (cancelled) return;
            setPedido(ped.data);
          } catch {
            /* bobina cai no fallback do kit */
          }
        }
      } catch {
        if (cancelled) return;
        setError('Ordem de produção não encontrada.');
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

  const liberada = podeVerFichaMateriais(ordem);

  useEffect(() => {
    if (!ordem) return;
    document.title = liberada
      ? `Materiais ${ordem.codigo} · ${ordem.parceiro?.razao_social ?? 'Ordem'}`
      : `Materiais · aguarda saída · ${ordem.codigo}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [ordem, liberada]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              voltarDaFicha(navigate, id ? `/ordens-producao/${id}` : '/ordens-producao')
            }
          >
            Voltar à ordem
          </button>
          <span className="ficha-toolbar-hint">
            {liberada
              ? 'Materiais · retirada física · A4 paisagem · após saída lógica'
              : 'Disponível depois de confirmar a saída em Estoque · A buscar'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!ordem || !liberada}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {ordem && !loading && !liberada && (
        <div className="alert alert-error ficha-error">
          Confirme a saída dos materiais em Estoque · A buscar antes de imprimir a
          retirada física. A ficha só lista o que já saiu no sistema.
        </div>
      )}

      {ordem && !loading && liberada && (
        <OrdemProducaoFichaMateriaisSheet
          ordem={ordem}
          pedido={pedido}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
