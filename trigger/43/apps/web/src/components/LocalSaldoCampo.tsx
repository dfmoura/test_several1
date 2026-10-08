import { useEffect, useId, useState } from 'react';
import { api, ApiError } from '../lib/api';

export type LocalSaldo = {
  id: number;
  codigo: string;
  nome?: string | null;
};

export function rotuloLocal(local: LocalSaldo | null | undefined): string {
  const nome = local?.nome?.trim();
  if (nome) return nome;
  return local?.codigo?.trim() || '';
}

let sugestoesCache: Promise<string[]> | null = null;

function carregarSugestoes(): Promise<string[]> {
  sugestoesCache ??= api
    .get<{ data: LocalSaldo[] }>('/estoque/enderecos')
    .then((res) => {
      const nomes = (res.data ?? []).map((e) => rotuloLocal(e)).filter((n) => n !== '');
      return [...new Set(nomes)];
    })
    .catch(() => []);
  return sugestoesCache;
}

function mensagemLocal(e: unknown): string {
  if (e instanceof ApiError) {
    const first = e.details ? Object.values(e.details)[0]?.[0] : undefined;
    return first ?? e.message;
  }
  return e instanceof Error ? e.message : 'Falha ao marcar o local.';
}

type Props = {
  produtoId: number;
  local: LocalSaldo | null | undefined;
  disabled?: boolean;
  onSaved: (local: LocalSaldo | null) => void;
};

/**
 * Um lugar para o saldo inteiro do SKU sem volume.
 * Nome livre (Garagem) ou código de um local já cadastrado.
 */
export function LocalSaldoCampo({ produtoId, local, disabled, onSaved }: Props) {
  const listaId = useId();
  const [texto, setTexto] = useState(rotuloLocal(local));
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setTexto(rotuloLocal(local));
  }, [local]);

  useEffect(() => {
    let vivo = true;
    void carregarSugestoes().then((nomes) => {
      if (vivo) setSugestoes(nomes);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const marcar = async () => {
    const nome = texto.trim();
    setBusy(true);
    setErro(null);
    try {
      const res = await api.post<{ data: { local: LocalSaldo | null } }>(
        `/estoque/saldos/${produtoId}/local`,
        nome === '' ? { endereco_id: null } : { nome },
      );
      onSaved(res.data.local);
      const rotulo = rotuloLocal(res.data.local);
      setTexto(rotulo);
      if (rotulo) {
        setSugestoes((prev) => (prev.includes(rotulo) ? prev : [...prev, rotulo]));
        sugestoesCache = null;
      }
    } catch (e) {
      setErro(mensagemLocal(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div className="btn-row" style={{ margin: 0, alignItems: 'center' }}>
        <input
          list={listaId}
          value={texto}
          disabled={disabled || busy}
          placeholder="Garagem, em cima das estantes…"
          aria-label="Local"
          style={{ minWidth: '12rem' }}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void marcar();
            }
          }}
        />
        <datalist id={listaId}>
          {sugestoes.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled || busy}
          onClick={() => void marcar()}
        >
          {texto.trim() === '' ? 'Tirar local' : 'Marcar local'}
        </button>
      </div>
      {erro ? <p className="form-hint">{erro}</p> : null}
    </div>
  );
}
