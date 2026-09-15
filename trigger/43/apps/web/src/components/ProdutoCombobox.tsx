import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { api, type Produto } from '../lib/api';

type Props = {
  label: string;
  value: Produto | null;
  onChange: (produto: Produto | null) => void;
  /** Filtra família na busca (ex.: MP). */
  familia?: string;
  /** Filtra grupo na busca (ex.: MP-PAP). */
  grupo?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
  emptyMessage?: string;
  /** Resumo abaixo do campo (padrão do ParceiroCombobox). */
  showSummary?: boolean;
};

function displayName(p: Pick<Produto, 'descricao_comercial' | 'descricao_fiscal'>): string {
  return (p.descricao_comercial?.trim() || p.descricao_fiscal || '').trim();
}

function optionMeta(p: Produto): string | null {
  const parts: string[] = [];
  if (p.familia) parts.push(p.familia);
  const grupo = p.grupo_catalogo?.codigo ?? p.grupo;
  if (grupo) parts.push(grupo);
  if (p.ncm) parts.push(`NCM ${p.ncm}`);
  const un = (p.unidade_comercial || p.unidade_interna || '').toUpperCase();
  if (un) parts.push(un);
  return parts.length ? parts.join(' · ') : null;
}

function selectedLabel(p: Produto): string {
  return `${p.codigo} — ${displayName(p)}`;
}

function SelectedSummary({ produto }: { produto: Produto }) {
  const meta = optionMeta(produto);
  return (
    <p className="parceiro-vinculo" style={{ margin: '0.35rem 0 0' }}>
      Selecionado:{' '}
      <strong>
        {produto.codigo} — {displayName(produto)}
      </strong>
      {meta ? ` · ${meta}` : ''}
    </p>
  );
}

async function searchProdutos(
  q: string,
  familia?: string,
  grupo?: string,
): Promise<Produto[]> {
  const qs = new URLSearchParams();
  if (familia) qs.set('familia', familia);
  if (grupo) qs.set('grupo', grupo);
  if (q.trim()) qs.set('q', q.trim());
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await api.get<{ data: Produto[] }>(`/produtos${suffix}`);
  return res.data;
}

/**
 * Typeahead de SKU — busca server-side (código, descrição, NCM, grupo).
 * Padrão alinhado ao ParceiroCombobox / FiscalCombobox; evita `<select>` com listagem longa.
 */
export function ProdutoCombobox({
  label,
  value,
  onChange,
  familia,
  grupo,
  disabled = false,
  required = false,
  placeholder = 'Buscar por código, descrição, NCM ou grupo…',
  hint,
  className,
  emptyMessage = 'Nenhum produto encontrado. Ajuste o termo ou cadastre o SKU.',
  showSummary = true,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const blurTimer = useRef<number | null>(null);

  const displayValue = open ? query : value ? selectedLabel(value) : '';

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const rows = await searchProdutos(q, familia, grupo);
        setOptions(rows);
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [familia, grupo],
  );

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

  const selectOption = (p: Produto) => {
    onChange(p);
    setOpen(false);
    setQuery('');
  };

  const clearSelection = () => {
    onChange(null);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      openAndSearch('');
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
      <label>
        {label}
        {required ? ' *' : ''}
      </label>
      <div
        className={`fiscal-combo-control${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
      >
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-required={required || undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          autoComplete="off"
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
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            scheduleSearch(next);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="fiscal-combo-actions">
          {value && !disabled && (
            <button
              type="button"
              className="fiscal-combo-icon-btn"
              title="Limpar"
              aria-label="Limpar seleção"
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

      {/* Mantém validação nativa do formulário sem expor <select> longo */}
      <input
        tabIndex={-1}
        aria-hidden
        required={required}
        value={value ? String(value.id) : ''}
        onChange={() => undefined}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />

      {open && (
        <ul id={listId} role="listbox" className="fiscal-combo-list">
          {loading && <li className="fiscal-combo-empty">Buscando…</li>}
          {!loading && options.length === 0 && (
            <li className="fiscal-combo-empty">
              {query.trim()
                ? emptyMessage
                : 'Digite para filtrar · ou navegue nos primeiros resultados.'}
            </li>
          )}
          {!loading &&
            options.map((opt, idx) => {
              const meta = optionMeta(opt);
              return (
                <li key={opt.id} role="option" aria-selected={highlight === idx}>
                  <button
                    type="button"
                    className={`fiscal-combo-option${highlight === idx ? ' is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => selectOption(opt)}
                  >
                    <span className="fiscal-combo-code">{opt.codigo}</span>
                    <span className="fiscal-combo-desc">{displayName(opt)}</span>
                    {meta && <span className="fiscal-combo-meta">{meta}</span>}
                  </button>
                </li>
              );
            })}
        </ul>
      )}

      {showSummary && value && !open ? <SelectedSummary produto={value} /> : null}

      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
