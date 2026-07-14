import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { NbsItem } from '@/types';

export type NbsLookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

export function useNbsLookup(codigoTribNac?: string, debounceMs = 400) {
  const [status, setStatus] = useState<NbsLookupStatus>('idle');
  const [resultados, setResultados] = useState<NbsItem[]>([]);
  const [selecionado, setSelecionado] = useState<NbsItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const buscar = useCallback(
    (query: string, immediate = false) => {
      cancel();
      const q = query.trim();
      const tribNac = codigoTribNac?.replace(/\D/g, '');

      if (q.length < 2 && !tribNac) {
        setStatus('idle');
        setResultados([]);
        setError(null);
        lastQueryRef.current = '';
        return;
      }

      const run = async () => {
        setStatus('loading');
        setError(null);
        try {
          const response = await api.buscarNbs(q, 20, tribNac?.length === 6 ? tribNac : undefined);
          lastQueryRef.current = q;
          setResultados(response.items);
          setStatus(response.items.length > 0 ? 'found' : 'not_found');
        } catch (err) {
          lastQueryRef.current = q;
          setResultados([]);
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Erro ao buscar código NBS.');
        }
      };

      if (immediate) {
        void run();
      } else {
        timerRef.current = setTimeout(() => void run(), debounceMs);
      }
    },
    [cancel, codigoTribNac, debounceMs],
  );

  const carregarSugestoes = useCallback(async () => {
    const tribNac = codigoTribNac?.replace(/\D/g, '');
    if (tribNac?.length !== 6) return;
    setStatus('loading');
    setError(null);
    try {
      const response = await api.buscarNbs('', 20, tribNac);
      setResultados(response.items);
      setStatus(response.items.length > 0 ? 'found' : 'not_found');
    } catch (err) {
      setResultados([]);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erro ao carregar sugestões NBS.');
    }
  }, [codigoTribNac]);

  const consultarCodigo = useCallback(async (codigo: string): Promise<NbsItem | null> => {
    const digits = codigo.replace(/\D/g, '');
    if (digits.length !== 9) {
      setSelecionado(null);
      return null;
    }

    try {
      const item = await api.consultarNbs(digits);
      setSelecionado(item);
      setError(null);
      return item;
    } catch (err) {
      setSelecionado(null);
      if (err instanceof ApiError && err.status === 404) {
        setError('Código NBS não encontrado na base oficial (ANEXO_B).');
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao consultar código NBS.');
      }
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    setStatus('idle');
    setResultados([]);
    setSelecionado(null);
    setError(null);
    lastQueryRef.current = '';
  }, [cancel]);

  useEffect(() => () => cancel(), [cancel]);

  return {
    status,
    resultados,
    selecionado,
    error,
    buscar,
    carregarSugestoes,
    consultarCodigo,
    setSelecionado,
    reset,
  };
}
