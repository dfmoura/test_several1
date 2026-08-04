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

type FiscalComboboxProps = {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  /** Digits-only value stored (NCM/CEST/CSOSN) */
  digitsOnly?: boolean;
  maxLength?: number;
  allowEmpty?: boolean;
  emptyLabel?: string;
  formatCodigo?: (codigo: string) => string;
  search: (query: string) => Promise<FiscalOption[]>;
  onChange: (codigo: string, option?: FiscalOption | null) => void;
  className?: string;
};

function defaultFormat(codigo: string): string {
  return codigo;
}

export function FiscalCombobox({
  label,
  value,
  disabled,
  placeholder = 'Buscar por código ou descrição…',
  hint,
  digitsOnly = false,
  maxLength,
  allowEmpty = false,
  emptyLabel = 'Limpar seleção',
  formatCodigo = defaultFormat,
  search,
  onChange,
  className,
}: FiscalComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<FiscalOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [activeObs, setActiveObs] = useState<string | null>(null);
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
        const rows = await search(q);
        setOptions(rows);
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      setActiveObs(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await search(value);
        if (cancelled) return;
        const match = rows.find((r) => r.codigo === value);
        if (match) {
          setSelectedLabel(match.descricao);
          setActiveObs(match.observacao ?? null);
        }
      } catch {
        /* ignore hydrate errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (blurTimer.current) window.clearTimeout(blurTimer.current);
    };
  }, []);

  const openAndSearch = (initial = '') => {
    if (disabled) return;
    setOpen(true);
    setQuery(initial);
    void runSearch(initial);
  };

  const scheduleSearch = (q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch(q);
    }, 280);
  };

  const selectOption = (opt: FiscalOption) => {
    onChange(opt.codigo, opt);
    setSelectedLabel(opt.descricao);
    setActiveObs(opt.observacao ?? null);
    setOpen(false);
    setQuery('');
  };

  const clearSelection = () => {
    onChange('', null);
    setSelectedLabel('');
    setActiveObs(null);
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
    <div className={`form-group fiscal-combo ${className ?? ''}`} ref={rootRef}>
      <label>{label}</label>
      <div className={`fiscal-combo-control${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
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
            // Digitação direta atualiza o valor (código) sem forçar opção
            if (digitsOnly) {
              onChange(next);
              if (!next) {
                setSelectedLabel('');
                setActiveObs(null);
              }
            }
          }}
          onKeyDown={onKeyDown}
        />
        <div className="fiscal-combo-actions">
          {value && !disabled && (
            <button
              type="button"
              className="fiscal-combo-icon-btn"
              title={allowEmpty ? emptyLabel : 'Limpar'}
              aria-label="Limpar"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSelection}
            >
              ×
            </button>
          )}
          <button
            type="button"
            className="fiscal-combo-icon-btn"
            disabled={disabled}
            aria-label="Abrir lista"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (open ? setOpen(false) : openAndSearch(''))}
          >
            ▾
          </button>
        </div>
      </div>

      {open && (
        <ul id={listId} role="listbox" className="fiscal-combo-list">
          {loading && <li className="fiscal-combo-empty">Buscando…</li>}
          {!loading && options.length === 0 && (
            <li className="fiscal-combo-empty">
              {query ? 'Nenhum resultado — digite o código completo se já souber.' : 'Digite para filtrar o catálogo.'}
            </li>
          )}
          {!loading &&
            options.map((opt, idx) => (
              <li key={`${opt.codigo || 'empty'}-${idx}`} role="option" aria-selected={highlight === idx}>
                <button
                  type="button"
                  className={`fiscal-combo-option${highlight === idx ? ' is-active' : ''}${opt.destaque ? ' is-destaque' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => selectOption(opt)}
                >
                  <span className="fiscal-combo-code">
                    {opt.codigo ? formatCodigo(opt.codigo) : '—'}
                  </span>
                  <span className="fiscal-combo-desc">{opt.descricao}</span>
                  {opt.meta && <span className="fiscal-combo-meta">{opt.meta}</span>}
                </button>
              </li>
            ))}
        </ul>
      )}

      {(hint || activeObs) && (
        <span className="form-hint">{activeObs || hint}</span>
      )}
    </div>
  );
}

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
