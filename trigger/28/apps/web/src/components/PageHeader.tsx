import Link from "next/link";
import type { ReactNode } from "react";

export type PageCrumb = {
  href: string;
  label: string;
};

/**
 * Cabeçalho canônico de tela do ERP.
 * Garante a mesma hierarquia visual em todas as rotas autenticadas:
 * breadcrumb → kicker → título → subtítulo → ações → conteúdo auxiliar (StepRail).
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  crumbs,
  titleExtra,
  actions,
  children,
  className = "",
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: PageCrumb[];
  titleExtra?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header-main">
        {crumbs && crumbs.length > 0 && (
          <nav className="page-crumbs" aria-label="Navegação local">
            {crumbs.map((c, i) => (
              <span key={`${c.href}-${c.label}`} className="page-crumb">
                {i === 0 ? (
                  <Link href={c.href}>← {c.label}</Link>
                ) : (
                  <>
                    <span className="page-crumb-sep" aria-hidden>
                      ·
                    </span>
                    <Link href={c.href}>{c.label}</Link>
                  </>
                )}
              </span>
            ))}
          </nav>
        )}

        {kicker ? <p className="page-kicker">{kicker}</p> : null}

        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          {titleExtra ? <div className="page-title-extra">{titleExtra}</div> : null}
        </div>

        {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
      </div>

      {actions ? <div className="page-actions">{actions}</div> : null}

      {children ? <div className="page-header-extra">{children}</div> : null}
    </header>
  );
}
