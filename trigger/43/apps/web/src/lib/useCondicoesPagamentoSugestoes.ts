import { useEffect, useState } from 'react';
import { api } from './api';
import { CONDICOES_PAGAMENTO_SUGESTOES } from './condicoesComerciais';

/** Sugestões ativas da EMP — fallback estático se a API falhar. */
export function useCondicoesPagamentoSugestoes(
  empresaId: number | null,
  authReady = true,
): string[] {
  const [sugestoes, setSugestoes] = useState<string[]>([...CONDICOES_PAGAMENTO_SUGESTOES]);

  useEffect(() => {
    if (!authReady) return;

    if (!empresaId) {
      setSugestoes([...CONDICOES_PAGAMENTO_SUGESTOES]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: { texto: string }[] }>(
          '/consulta/condicoes-pagamento-sugestoes',
          empresaId,
        );
        if (cancelled) return;
        const textos = res.data.map((s) => s.texto.trim()).filter(Boolean);
        setSugestoes(textos.length > 0 ? textos : [...CONDICOES_PAGAMENTO_SUGESTOES]);
      } catch {
        if (!cancelled) {
          setSugestoes([...CONDICOES_PAGAMENTO_SUGESTOES]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [empresaId, authReady]);

  return sugestoes;
}
