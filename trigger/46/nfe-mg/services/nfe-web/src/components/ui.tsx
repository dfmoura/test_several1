interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-slate-500">
      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {label}
    </div>
  );
}

const styles: Record<string, string> = {
  AUTORIZADA: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELADA: 'bg-red-50 text-red-700 ring-red-600/20',
  PROCESSANDO: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  ENVIANDO: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  REJEITADA: 'bg-red-50 text-red-700 ring-red-600/20',
  DENEGADA: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  RASCUNHO: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  mock: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  ausente: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  aviso: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  atencao: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  critico: 'bg-red-50 text-red-700 ring-red-600/20',
  expirado: 'bg-red-50 text-red-700 ring-red-600/20',
};

export function StatusBadge({ value }: { value: string }) {
  const cls = styles[value] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}
