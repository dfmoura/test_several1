interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  subtitleBreakAll?: boolean;
}

export function PageHeader({ title, subtitle, actions, subtitleBreakAll }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && (
          <p
            className={`mt-1 text-sm text-slate-500 ${subtitleBreakAll ? 'break-all font-mono text-xs sm:text-sm' : ''}`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">{actions}</div>
      )}
    </div>
  );
}
