import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../lib/api';

export type RevendaSkuOpcao = {
  id: number;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_tabela: string | null;
};

type Props = {
  value: RevendaSkuOpcao | null;
  onChange: (sku: RevendaSkuOpcao | null) => void;
  disabled?: boolean;
};

async function buscar(q: string): Promise<RevendaSkuOpcao[]> {
  const qs = new URLSearchParams();
  if (q.trim()) qs.set('q', q.trim());
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await api.get<{ data: RevendaSkuOpcao[] }>(`/orcamentos/revenda-skus${suffix}`);
  return res.data ?? [];
}

/**
 * Busca de SKU REV ativo da empresa. Não usa o cadastro geral de produtos.
 */
export function RevendaSkuCombobox({ value, onChange, disabled = false }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<RevendaSkuOpcao[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const blurTimer = useRef<number | null>(null);

  const displayValue = open ? query : value ? `${value.codigo} — ${value.descricao}` : '';

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const rows = await buscar(q);
      setOptions(rows);
      setHighlight(0);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const selectOption = (sku: RevendaSkuOpcao) => {
    onChange(sku);
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
    <div className="form-group span-full fiscal-combo" ref={rootRef}>
      <label>Produto *</label>
      <div className={`fiscal-combo-control${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-required
          disabled={disabled}
          placeholder="Buscar por código ou descrição…"
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
      </div>
      {open ? (
        <ul id={listId} role="listbox" className="fiscal-combo-list">
          {loading ? <li className="fiscal-combo-empty">Buscando…</li> : null}
          {!loading && options.length === 0 ? (
            <li className="fiscal-combo-empty">Nenhum SKU de revenda ativo.</li>
          ) : null}
          {!loading
            ? options.map((opt, idx) => (
                <li key={opt.id} role="option" aria-selected={highlight === idx}>
                  <button
                    type="button"
                    className={`fiscal-combo-option${highlight === idx ? ' is-active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => selectOption(opt)}
                  >
                    <span className="fiscal-combo-code">{opt.codigo}</span>
                    <span className="fiscal-combo-desc">{opt.descricao}</span>
                    {opt.unidade ? <span className="fiscal-combo-meta">{opt.unidade}</span> : null}
                  </button>
                </li>
              ))
            : null}
        </ul>
      ) : null}
      <p className="form-hint" style={{ marginBottom: 0 }}>
        Família REV, ativa, desta empresa. O preço de tabela só sugere o unitário.
      </p>
    </div>
  );
}
