import type { UsuarioRef } from '../lib/api';
import { formatDateTime } from '../lib/format';

export type RegistroAutoria = {
  criado_por?: UsuarioRef | null;
  atualizado_por?: UsuarioRef | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  registro: RegistroAutoria | null | undefined;
  className?: string;
};

function line(user: UsuarioRef | null | undefined, when: string | null | undefined): string {
  const nome = user?.name?.trim() || '—';
  const data = formatDateTime(when);
  if (nome === '—' && data === '—') return '—';
  if (nome === '—') return data;
  if (data === '—') return nome;
  return `${nome} · ${data}`;
}

/**
 * Metadado de autoria do agregado (cadastrado / última edição).
 * Visual quieto (auditoria) — não compete com o conteúdo operacional.
 * Só exibir em edição — registros legados sem selo mostram "—".
 */
export function RegistroMetaStrip({ registro, className = '' }: Props) {
  if (!registro) return null;

  return (
    <div
      className={`meta-strip registro-meta-strip ${className}`.trim()}
      aria-label="Autoria do registro"
    >
      <div className="meta-chip">
        <strong>Cadastrado</strong>
        <span>{line(registro.criado_por, registro.created_at)}</span>
      </div>
      <div className="meta-chip">
        <strong>Última edição</strong>
        <span>{line(registro.atualizado_por, registro.updated_at)}</span>
      </div>
    </div>
  );
}
