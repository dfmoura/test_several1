import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import type { CartaoCnpjData } from '@/types';

export type CnpjLookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

export function useCnpjLookup(debounceMs = 600) {
  const [status, setStatus] = useState<CnpjLookupStatus>('idle');
  const [dados, setDados] = useState<CartaoCnpjData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCnpjRef = useRef<string>('');

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lookup = useCallback(
    (cnpj: string, immediate = false) => {
      cancel();
      const digits = cnpj.replace(/\D/g, '');
      if (digits.length !== 14) {
        setStatus('idle');
        setDados(null);
        setError(null);
        lastCnpjRef.current = '';
        return;
      }

      const run = async () => {
        if (!immediate && digits === lastCnpjRef.current && status === 'found') return;
        setStatus('loading');
        setError(null);
        try {
          const result = await api.consultarCnpj(digits);
          lastCnpjRef.current = digits;
          setDados({
            cnpj: result.cnpj,
            razaoSocial: result.razaoSocial,
            nomeFantasia: result.nomeFantasia,
            situacaoCadastral: result.situacaoCadastral,
            email: result.email,
            telefone: result.telefone,
            endereco: result.endereco,
            porte: result.porte,
            naturezaJuridica: result.naturezaJuridica,
            dataAbertura: result.dataAbertura,
            tipoEstabelecimento: result.tipoEstabelecimento,
            optanteSimples: result.optanteSimples,
            atividadePrincipal: result.atividadePrincipal,
            fonte: result.fonte,
          });
          setStatus('found');
        } catch (err) {
          lastCnpjRef.current = digits;
          setDados(null);
          if (err instanceof ApiError && err.status === 404) {
            setStatus('not_found');
            setError('CNPJ não encontrado na base da Receita Federal.');
          } else {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Erro ao consultar CNPJ.');
          }
        }
      };

      if (immediate) {
        void run();
      } else {
        timerRef.current = setTimeout(() => void run(), debounceMs);
      }
    },
    [cancel, debounceMs, status],
  );

  const reset = useCallback(() => {
    cancel();
    setStatus('idle');
    setDados(null);
    setError(null);
    lastCnpjRef.current = '';
  }, [cancel]);

  useEffect(() => () => cancel(), [cancel]);

  return { status, dados, error, lookup, reset };
}
