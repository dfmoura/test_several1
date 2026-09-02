import { useSessaoPresenca } from '../lib/sessaoPresenca';

type Props = {
  enabled: boolean;
  idleMinutes: number;
};

/**
 * Aviso discreto quando a sessão está perto de encerrar por inatividade no servidor.
 */
export function SessaoIdleBanner({ enabled, idleMinutes }: Props) {
  const { aviso, continuar } = useSessaoPresenca({ enabled, idleMinutes });

  if (!aviso) return null;

  return (
    <div className="sessao-idle-banner" role="status" aria-live="polite">
      <p>
        Sessão encerra por inatividade em <strong>{aviso.remainingLabel}</strong>. Continue
        trabalhando ou confirme para manter o acesso.
      </p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={continuar}>
        Manter sessão
      </button>
    </div>
  );
}
