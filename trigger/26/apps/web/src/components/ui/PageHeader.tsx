"use client";

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>{actions}</div>}
    </header>
  );
}
