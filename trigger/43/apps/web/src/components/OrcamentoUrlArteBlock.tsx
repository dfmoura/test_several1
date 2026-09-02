import { isSafeExternalUrl, urlArteHostLabel } from '../lib/urlArte';

type Props = {
  url: string | null | undefined;
  /** Estilo da proposta pública / ficha cliente. */
  variant?: 'pub' | 'ficha' | 'inline';
};

/**
 * Bloco da prova de arte — sempre link externo seguro.
 * Não embute PDF/imagem (formatos variados sem quebrar layout/segurança).
 */
export function OrcamentoUrlArteBlock({ url, variant = 'pub' }: Props) {
  const href = url && isSafeExternalUrl(url) ? url : null;
  if (!href) return null;

  const host = urlArteHostLabel(href);

  if (variant === 'inline') {
    return (
      <p className="orc-url-arte-inline">
        <strong>Arte para aprovação:</strong>{' '}
        <a href={href} target="_blank" rel="noopener noreferrer">
          {host}
        </a>
      </p>
    );
  }

  if (variant === 'ficha') {
    return (
      <div className="orc-url-arte orc-url-arte--ficha">
        <p className="orc-url-arte-lead">
          Formato final da arte para o cliente conferir antes de aprovar.
        </p>
        <a className="orc-url-arte-link" href={href} target="_blank" rel="noopener noreferrer">
          Abrir arte
        </a>
        <p className="orc-url-arte-url">{href}</p>
      </div>
    );
  }

  return (
    <section className="orc-pub-card orc-url-arte">
      <h2>Arte para aprovação</h2>
      <p className="orc-pub-hint">
        Confira o formato final da arte neste link (PDF, imagem ou arquivo compartilhado). A
        visualização abre em nova aba, no formato original.
      </p>
      <a className="orc-url-arte-cta" href={href} target="_blank" rel="noopener noreferrer">
        Abrir arte para aprovação
      </a>
      <p className="orc-url-arte-meta">{host}</p>
      <p className="orc-url-arte-url print-only">{href}</p>
    </section>
  );
}
