import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../lib/api';

export type InsumoSlot = 'papel' | 'acabamento' | 'tubete' | 'caixa';

export type InsumoSkuOpcao = {
  id: number;
  codigo: string;
  descricao: string;
  unidade: string;
  saldo: string;
  grupo: string;
  tarifa: string | null;
};

type Props = {
  slot: InsumoSlot;
  label: string;
  value: InsumoSkuOpcao | null;
  onChange: (sku: InsumoSkuOpcao | null) => void;
  disabled?: boolean;
  hint?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

const VAZIO: Record<InsumoSlot, string> = {
  papel: 'Nenhum papel com saldo (MP-PAP ou MP-FLM).',
  acabamento: 'Nenhum acabamento com saldo (MP-LAM ou MP-CLD).',
  tubete: 'Nenhum tubete com saldo.',
  caixa: 'Nenhuma caixa com saldo.',
};

async function buscar(slot: InsumoSlot, q: string, incluirId: number | null): Promise<InsumoSkuOpcao[]> {
  const qs = new URLSearchParams({ slot });
  if (q.trim()) qs.set('q', q.trim());
  if (incluirId && incluirId > 0) qs.set('incluir_id', String(incluirId));
  const res = await api.get<{ data: InsumoSkuOpcao[] }>(`/orcamentos/insumos?${qs}`);
  return res.data ?? [];
}

function rotulo(opt: InsumoSkuOpcao): string {
  if (opt.codigo) return `${opt.codigo} — ${opt.descricao}`;
  return opt.descricao;
}

/**
 * Busca de SKU ativo com saldo, no mesmo padrão do combo de revenda.
 */
export function InsumoSkuCombobox({
  slot,
  label,
  value,
  onChange,
  disabled = false,
  hint,
  allowEmpty = false,
  emptyLabel = 'Sem filme',
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<InsumoSkuOpcao[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const blurTimer = useRef<number | null>(null);

  const displayValue = open ? query : value ? rotulo(value) : '';

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const rows = await buscar(slot, q, value && value.id > 0 ? value.id : null);
        setOptions(rows);
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [slot, value],
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

  const selectOption = (sku: InsumoSkuOpcao) => {
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
    <div className="fiscal-combo" ref={rootRef}>
      <label>{label}</label>
      <div className={`fiscal-combo-control${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
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
          {!loading && options.length === 0 ? <li className="fiscal-combo-empty">{VAZIO[slot]}</li> : null}
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
                    <span className="fiscal-combo-meta">
                      {opt.saldo} {opt.unidade}
                    </span>
                  </button>
                </li>
              ))
            : null}
        </ul>
      ) : null}
      {hint || (allowEmpty && value && value.id > 0) ? (
        <p className="field-note">
          {hint ? <span>{hint}</span> : null}
          {allowEmpty && value && value.id > 0 ? (
            <>
              {hint ? ' ' : null}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange(null)}
              >
                {emptyLabel}
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
