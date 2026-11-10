import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  /** Texto simples ou markup (ex.: lead do cliente + meta da versão). */
  description?: ReactNode;
  actions?: ReactNode;
  /**
   * `list` = cabeçalho denso para telas de registros (tabela em foco).
   * Detalhe/formulário mantém o padrão default.
   */
  variant?: 'default' | 'list';
};

export function PageHeader({ title, description, actions, variant = 'default' }: PageHeaderProps) {
  const isList = variant === 'list';
  return (
    <div className={isList ? 'page-header page-header--list' : 'page-header'}>
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {description != null && description !== '' && (
            <p className="page-header-desc">{description}</p>
          )}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
