import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapasFacasFichaSheet } from '../components/MapasFacasFichaSheet';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { brandDocumentTitle } from '../lib/brand';
import {
  parseMapaFacasFichaFiltros,
  type FacaMapaItem,
} from '../lib/facasMapa';
import { voltarDaFicha } from '../lib/fichaNav';

type FacasListResponse = {
  total: number;
  items: FacaMapaItem[];
};

export function MapasFacasFichaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, empresas, empresaId } = useAuth();
  const [items, setItems] = useState<FacaMapaItem[]>([]);
  const [totalApi, setTotalApi] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const emitidoEm = useMemo(() => new Date(), []);

  const filtros = useMemo(
    () => parseMapaFacasFichaFiltros(searchParams),
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
        if (filtros.formato) qs.set('formato', filtros.formato);
        if (filtros.maquina) qs.set('maquina', filtros.maquina);
        if (filtros.soCompletas) qs.set('so_completas', '1');
        if (filtros.incluirInativas) qs.set('incluir_inativas', '1');
        qs.set('limit', '800');

        const list = await api.get<FacasListResponse>(`/facas?${qs}`);
        if (cancelled) return;
        setItems(list.items ?? []);
        setTotalApi(list.total ?? list.items?.length ?? 0);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Falha ao carregar mapa de facas.');
        setItems([]);
        setTotalApi(0);
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
    document.title = `Ficha · Mapa de facas · ${empresaNome}`;
    return () => {
      document.title = brandDocumentTitle();
    };
  }, [empresaNome]);

  return (
    <div className="ficha-page">
      <div className="ficha-toolbar no-print">
        <div className="ficha-toolbar-left">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => voltarDaFicha(navigate, '/mapa-facas')}
          >
            Voltar ao mapa
          </button>
          <span className="ficha-toolbar-hint">
            Retrato A4 · agrupado por máquina · N da faca · use Imprimir ou Salvar como PDF
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading || !!error}
          onClick={() => window.print()}
        >
          Imprimir ficha
        </button>
      </div>

      {loading && <div className="loading ficha-loading">Carregando ficha…</div>}
      {error && !loading && <div className="alert alert-error ficha-error">{error}</div>}

      {!loading && !error && (
        <MapasFacasFichaSheet
          items={items}
          totalApi={totalApi}
          filtros={filtros}
          empresaNome={empresaNome}
          emitidoPor={user?.name ?? user?.email ?? 'usuário'}
          emitidoEm={emitidoEm}
        />
      )}
    </div>
  );
}
