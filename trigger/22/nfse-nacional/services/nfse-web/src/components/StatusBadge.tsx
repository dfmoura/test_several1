const styles: Record<string, string> = {
  AUTORIZADA: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELADA: 'bg-red-50 text-red-700 ring-red-600/20',
  SUBSTITUIDA: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ANALISE_FISCAL: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  RASCUNHO: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  ENVIANDO: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  REJEITADA: 'bg-red-50 text-red-700 ring-red-600/20',
  REGISTRADO: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJEITADO: 'bg-red-50 text-red-700 ring-red-600/20',
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  degraded: 'bg-red-50 text-red-700 ring-red-600/20',
};

export function StatusBadge({ value }: { value: string }) {
  const cls = styles[value] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}
