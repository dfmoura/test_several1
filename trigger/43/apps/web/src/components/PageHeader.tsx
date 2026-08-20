import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
