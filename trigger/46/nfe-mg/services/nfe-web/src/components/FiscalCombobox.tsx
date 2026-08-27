import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export type FiscalOption = {
  codigo: string;
  descricao: string;
  meta?: string | null;
  observacao?: string | null;
  destaque?: boolean;
};

type Props = {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  digitsOnly?: boolean;
  maxLength?: number;
  allowEmpty?: boolean;
  formatCodigo?: (codigo: string) => string;
  search: (query: string) => Promise<FiscalOption[]>;
  onChange: (codigo: string, option?: FiscalOption | null) => void;
};

export function formatNcm(codigo: string): string {
  const d = codigo.replace(/\D/g, '');
  if (d.length !== 8) return codigo;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

export function formatCest(codigo: string): string {
  const d = codigo.replace(/\D/g, '');
  if (d.length !== 7) return codigo;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
}

export function FiscalCombobox({
  label,
  value,
  disabled,
  placeholder = 'Buscar código ou descrição…',
  hint,
  digitsOnly = false,
  maxLength,
  allowEmpty = true,
  formatCodigo = (c) => c,
  search,
  onChange,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<FiscalOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState('');
  const debounceRef = useRef<number | null>(null);
  const blurTimer = useRef<number | null>(null);

  const displayValue = open
    ? query
    : value
      ? `${formatCodigo(value)}${selectedLabel ? ` — ${selectedLabel}` : ''}`
      : '';

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        setOptions(await search(q));
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await search(value);
        if (cancelled) return;
        const match = rows.find((r) => r.codigo === value);
        if (match) setSelectedLabel(match.descricao);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [value, search]);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  }, []);

  const openAndSearch = (initial = '') => {
    if (disabled) return;
    setOpen(true);
    setQuery(initial);
    void runSearch(initial);
  };

  const scheduleSearch = (q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => void runSearch(q), 280);
  };

  const selectOption = (opt: FiscalOption) => {
    onChange(opt.codigo, opt);
    setSelectedLabel(opt.descricao);
    setOpen(false);
    setQuery('');
  };

  const clearSelection = () => {
    onChange('', null);
    setSelectedLabel('');
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openAndSearch(digitsOnly ? value : '');
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) selectOption(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <div className="relative">
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="input pr-16"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          maxLength={open && digitsOnly ? maxLength : undefined}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            openAndSearch('');
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => {
              setOpen(false);
              setQuery('');
            }, 160);
          }}
          onChange={(e) => {
            let next = e.target.value;
            if (digitsOnly) next = next.replace(/\D/g, '');
            if (maxLength) next = next.slice(0, maxLength);
            setQuery(next);
            setOpen(true);
            scheduleSearch(next);
            if (digitsOnly) {
              onChange(next);
              if (!next) setSelectedLabel('');
            }
          }}
          onKeyDown={onKeyDown}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {value && !disabled && allowEmpty && (
            <button
              type="button"
              className="rounded px-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Limpar"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSelection}
            >
              ×
            </button>
          )}
          <button
            type="button"
            className="rounded px-1.5 text-slate-400 hover:bg-slate-100"
            disabled={disabled}
            aria-label="Abrir"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (open ? setOpen(false) : openAndSearch(''))}
          >
            ▾
          </button>
        </div>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading && <li className="px-3 py-2 text-xs text-slate-400">Buscando…</li>}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">
              {query ? 'Nenhum resultado — digite o código completo se já souber.' : 'Digite para filtrar.'}
            </li>
          )}
          {!loading &&
            options.map((opt, idx) => (
              <li key={`${opt.codigo}-${idx}`} role="option" aria-selected={highlight === idx}>
                <button
                  type="button"
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    highlight === idx ? 'bg-brand-50' : ''
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => selectOption(opt)}
                >
                  <span className="font-mono text-xs font-semibold text-brand-700">
                    {opt.codigo ? formatCodigo(opt.codigo) : '—'}
                    {opt.destaque ? ' ·' : ''}
                  </span>
                  <span className="text-xs leading-snug text-slate-600">{opt.descricao}</span>
                  {opt.observacao && <span className="text-[11px] text-amber-700">{opt.observacao}</span>}
                </button>
              </li>
            ))}
        </ul>
      )}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
