import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  /** Texto simples ou markup (ex.: lead do cliente + meta da versão). */
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
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
