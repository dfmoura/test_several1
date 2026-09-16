import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import {
  type EstoqueQrEnderecoInfo,
  type EstoqueQrOrdemLeitura,
  type EstoqueQrVolumeInfo,
} from '../lib/estoqueQrFila';

type Options = {
  canWrite: boolean;
  /** Se informado, rejeita volume de outro SKU. */
  produtoIdEsperado?: number | null;
  /** Chamado no 1º volume quando não há produto esperado (inferência). */
  onPrimeiroVolume?: (vol: EstoqueQrVolumeInfo) => void | Promise<void>;
  /** Foco inicial ao montar. */
  focoInicial?: boolean;
};

/**
 * Sessão de leitura QR: fila de 1+ volumes + local confirmado.
 * A leitura nunca grava — o consumidor decide o POST (Guardar / INV / AJU).
 */
export function useEstoqueQrFila(opts: Options) {
  const { canWrite, produtoIdEsperado = null, onPrimeiroVolume, focoInicial = true } = opts;
  const volRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const [ordem, setOrdem] = useState<EstoqueQrOrdemLeitura>('volume_primeiro');
  const [volumeQr, setVolumeQr] = useState('');
  const [enderecoQr, setEnderecoQr] = useState('');
  const [fila, setFila] = useState<EstoqueQrVolumeInfo[]>([]);
  const [endereco, setEndereco] = useState<EstoqueQrEnderecoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const focusPrimeiro = useCallback((o: EstoqueQrOrdemLeitura = ordem) => {
    setTimeout(() => {
      if (o === 'vao_primeiro') {
        endRef.current?.focus();
      } else {
        volRef.current?.focus();
      }
    }, 50);
  }, [ordem]);

  useEffect(() => {
    if (focoInicial) {
      volRef.current?.focus();
    }
  }, [focoInicial]);

  const limparTudo = useCallback((optsLimpar?: { manterVao?: boolean; manterFila?: boolean }) => {
    setVolumeQr('');
    setError(null);
    if (!optsLimpar?.manterFila) {
      setFila([]);
    }
    if (!optsLimpar?.manterVao) {
      setEndereco(null);
      setEnderecoQr('');
    }
  }, []);

  const trocarOrdem = useCallback(
    (nova: EstoqueQrOrdemLeitura) => {
      if (nova === ordem) return;
      setOrdem(nova);
      setMsg(null);
      setError(null);
      setVolumeQr('');
      focusPrimeiro(nova);
    },
    [ordem, focusPrimeiro],
  );

  const adicionarVolume = useCallback(
    async (payload: string) => {
      const p = payload.trim();
      if (!p) return;
      if (p.toUpperCase().startsWith('END:')) {
        setError('Esse QR é de local (END:…). Use o campo do local.');
        volRef.current?.select();
        return;
      }
      setError(null);
      setMsg(null);
      setBusy(true);
      try {
        const res = await api.get<{ data: EstoqueQrVolumeInfo }>(
          `/estoque/volumes/por-qr?payload=${encodeURIComponent(p)}`,
        );
        const vol = res.data;
        if (produtoIdEsperado != null && vol.produto && vol.produto.id !== produtoIdEsperado) {
          setError(
            `Volume ${vol.codigo} é do SKU ${vol.produto.codigo} — esperado outro produto nesta contagem.`,
          );
          volRef.current?.select();
          return;
        }
        const item = { ...vol, qr_payload: vol.qr_payload || p };
        let jaNaFila = false;
        let novaLen = 0;
        let eraVazia = false;
        setFila((prev) => {
          if (prev.some((v) => v.lote_id === vol.lote_id)) {
            jaNaFila = true;
            novaLen = prev.length;
            return prev;
          }
          eraVazia = prev.length === 0;
          novaLen = prev.length + 1;
          return [...prev, item];
        });
        if (jaNaFila) {
          setError(`Volume ${vol.codigo} já está na fila.`);
          setVolumeQr('');
          setTimeout(() => volRef.current?.focus(), 50);
          return;
        }
        setMsg(
          `Volume ${vol.codigo} na fila (${novaLen}). Continue lendo ou confirme o local.`,
        );
        setVolumeQr('');
        if (eraVazia && onPrimeiroVolume) {
          await onPrimeiroVolume(item);
        }
        setTimeout(() => volRef.current?.focus(), 50);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Volume não reconhecido.');
        volRef.current?.select();
      } finally {
        setBusy(false);
      }
    },
    [onPrimeiroVolume, produtoIdEsperado],
  );

  const removerDaFila = useCallback((loteId: number) => {
    setFila((prev) => prev.filter((v) => v.lote_id !== loteId));
    setError(null);
    setMsg(null);
    setTimeout(() => volRef.current?.focus(), 50);
  }, []);

  const resolverLocal = useCallback(async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('VOL:')) {
      setError('Esse QR é de volume (VOL:…). Use o campo do volume para incluir na fila.');
      endRef.current?.select();
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await api.get<{ data: EstoqueQrEnderecoInfo }>(
        `/estoque/enderecos/por-qr?payload=${encodeURIComponent(p)}`,
      );
      setEndereco(res.data);
      setEnderecoQr(p);
      setFila((prev) => {
        const n = prev.length;
        setMsg(
          n > 0
            ? `Local ${res.data.codigo} confirmado. Pronto para registrar ${n} volume${n === 1 ? '' : 's'}.`
            : `Local ${res.data.codigo} confirmado. Inclua 1 ou mais volumes na fila.`,
        );
        return prev;
      });
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (err) {
      setEndereco(null);
      setError(err instanceof ApiError ? err.message : 'Local não reconhecido.');
      endRef.current?.select();
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    volRef,
    endRef,
    ordem,
    volumeQr,
    setVolumeQr,
    enderecoQr,
    setEnderecoQr,
    fila,
    setFila,
    endereco,
    error,
    setError,
    msg,
    setMsg,
    busy,
    setBusy,
    canWrite,
    focusPrimeiro,
    limparTudo,
    trocarOrdem,
    adicionarVolume,
    removerDaFila,
    resolverLocal,
  };
}

export type UseEstoqueQrFilaReturn = ReturnType<typeof useEstoqueQrFila>;
