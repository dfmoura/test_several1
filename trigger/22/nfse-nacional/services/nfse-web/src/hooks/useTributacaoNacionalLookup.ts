import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { TributacaoNacionalItem } from '@/types';

export type TributacaoLookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

export function useTributacaoNacionalLookup(debounceMs = 400) {
  const [status, setStatus] = useState<TributacaoLookupStatus>('idle');
  const [resultados, setResultados] = useState<TributacaoNacionalItem[]>([]);
  const [selecionado, setSelecionado] = useState<TributacaoNacionalItem | null>(null);
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
      if (q.length < 2) {
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
          const response = await api.buscarTributacaoNacional(q);
          lastQueryRef.current = q;
          setResultados(response.items);
          setStatus(response.items.length > 0 ? 'found' : 'not_found');
        } catch (err) {
          lastQueryRef.current = q;
          setResultados([]);
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Erro ao buscar código de tributação.');
        }
      };

      if (immediate) {
        void run();
      } else {
        timerRef.current = setTimeout(() => void run(), debounceMs);
      }
    },
    [cancel, debounceMs],
  );

  const consultarCodigo = useCallback(async (codigo: string): Promise<TributacaoNacionalItem | null> => {
    const digits = codigo.replace(/\D/g, '');
    if (digits.length !== 6) {
      setSelecionado(null);
      return null;
    }

    try {
      const item = await api.consultarTributacaoNacional(digits);
      setSelecionado(item);
      setError(null);
      return item;
    } catch (err) {
      setSelecionado(null);
      if (err instanceof ApiError && err.status === 404) {
        setError('Código não encontrado na base nacional LC 116.');
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao consultar código.');
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
    consultarCodigo,
    setSelecionado,
    reset,
  };
}
