/**
 * Presence keepalive da sessão Bearer (ADR_SESSAO_ACESSO).
 *
 * Idle no servidor = gap sem request autenticado (last_used_at).
 * Aqui: atividade de UI (teclado/ponteiro) → ping leve antes do idle,
 * sem manter assento se o usuário realmente parou.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken } from './api';
import { SESSAO_ACESSO } from './sessaoAcesso';
import {
  getLastServerTouchAt,
  markSessaoServerTouch,
  subscribeSessaoServerTouch,
} from './sessaoTouch';

export type SessaoPolitica = {
  idleMinutes: number;
  maxUsuariosSimultaneos: number;
};

export function resolveSessaoPolitica(
  fromServer?: { idle_minutes?: number; max_usuarios_simultaneos?: number } | null,
): SessaoPolitica {
  const idle = Number(fromServer?.idle_minutes);
  const max = Number(fromServer?.max_usuarios_simultaneos);
  return {
    idleMinutes: Number.isFinite(idle) && idle >= 1 ? Math.floor(idle) : SESSAO_ACESSO.idleMinutes,
    maxUsuariosSimultaneos:
      Number.isFinite(max) && max >= 1 ? Math.floor(max) : SESSAO_ACESSO.maxUsuariosSimultaneos,
  };
}

/** Intervalo entre pings com presença recente ≈ ⅓ do idle (mín. 2 min). */
export function pingIntervalMs(idleMinutes: number): number {
  return Math.max(2, Math.floor(idleMinutes / 3)) * 60_000;
}

/** Aviso quando faltam ≤ ⅙ do idle (teto 5 min, piso 1 min). */
export function warnBeforeMs(idleMinutes: number): number {
  return Math.min(5, Math.max(1, Math.floor(idleMinutes / 6))) * 60_000;
}

export type SessaoPresencaAviso = {
  remainingMs: number;
  remainingLabel: string;
} | null;

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}s`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec.toString().padStart(2, '0')}s`;
}

type UseSessaoPresencaOpts = {
  enabled: boolean;
  idleMinutes: number;
};

/**
 * Mantém a sessão viva enquanto há atividade recente na aba visível.
 * Mostra aviso quando o idle do servidor está perto de estourar sem presença.
 */
export function useSessaoPresenca({ enabled, idleMinutes }: UseSessaoPresencaOpts): {
  aviso: SessaoPresencaAviso;
  continuar: () => void;
} {
  const [aviso, setAviso] = useState<SessaoPresencaAviso>(null);
  const lastUiAt = useRef(Date.now());
  const pinging = useRef(false);
  const idleRef = useRef(idleMinutes);

  useEffect(() => {
    idleRef.current = idleMinutes;
  }, [idleMinutes]);

  const touchUi = useCallback(() => {
    lastUiAt.current = Date.now();
  }, []);

  const doPing = useCallback(async () => {
    if (!enabled || !getToken() || pinging.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    pinging.current = true;
    try {
      await api.pingSessao();
      setAviso(null);
    } catch {
      /* 401 já limpa via api.ts; rede/5xx: próximo tick tenta de novo */
    } finally {
      pinging.current = false;
    }
  }, [enabled]);

  const continuar = useCallback(() => {
    touchUi();
    void doPing();
  }, [touchUi, doPing]);

  useEffect(() => {
    if (!enabled) {
      setAviso(null);
      return;
    }

    touchUi();
    markSessaoServerTouch();

    const onActivity = () => touchUi();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', onActivity, opts);
    window.addEventListener('keydown', onActivity, opts);
    window.addEventListener('scroll', onActivity, opts);
    window.addEventListener('touchstart', onActivity, opts);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        touchUi();
        const idleMs = idleRef.current * 60_000;
        const sinceServer = Date.now() - getLastServerTouchAt();
        const sinceUi = Date.now() - lastUiAt.current;
        if (sinceUi < pingIntervalMs(idleRef.current) && sinceServer > idleMs / 2) {
          void doPing();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const tick = window.setInterval(() => {
      if (!getToken()) {
        setAviso(null);
        return;
      }

      const idleMs = idleRef.current * 60_000;
      const pingEvery = pingIntervalMs(idleRef.current);
      const warnMs = warnBeforeMs(idleRef.current);
      const now = Date.now();
      const sinceUi = now - lastUiAt.current;
      const sinceServer = now - getLastServerTouchAt();
      const remainingServer = idleMs - sinceServer;

      const presençaRecente = sinceUi < pingEvery;
      const abaVisivel =
        typeof document === 'undefined' || document.visibilityState === 'visible';

      if (abaVisivel && presençaRecente && sinceServer >= pingEvery) {
        void doPing();
        return;
      }

      if (abaVisivel && remainingServer <= warnMs && remainingServer > 0) {
        if (presençaRecente) {
          void doPing();
          return;
        }
        setAviso({
          remainingMs: remainingServer,
          remainingLabel: formatRemaining(remainingServer),
        });
        return;
      }

      setAviso(null);
    }, 15_000);

    const unsub = subscribeSessaoServerTouch(() => {
      setAviso(null);
    });

    return () => {
      window.clearInterval(tick);
      window.removeEventListener('pointerdown', onActivity, opts);
      window.removeEventListener('keydown', onActivity, opts);
      window.removeEventListener('scroll', onActivity, opts);
      window.removeEventListener('touchstart', onActivity, opts);
      document.removeEventListener('visibilitychange', onVisibility);
      unsub();
      setAviso(null);
    };
  }, [enabled, doPing, touchUi]);

  return { aviso, continuar };
}
