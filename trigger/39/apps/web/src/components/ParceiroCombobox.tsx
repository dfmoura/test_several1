import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { api, type Parceiro } from '../lib/api';
import { formatCnpjCpf } from '../lib/format';

export type ParceiroPapelFiltro =
  | 'cliente'
  | 'fornecedor'
  | 'colaborador'
  | 'transportadora'
  | 'banco'
  | 'entidade'
  | 'vendedor'
  | 'contador'
  | 'orcavel'
  | 'prospect';

type Props = {
  label: string;
  value: Parceiro | null;
  onChange: (parceiro: Parceiro | null) => void;
  papel?: ParceiroPapelFiltro;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
  emptyMessage?: string;
};

function displayName(p: Pick<Parceiro, 'nome_fantasia' | 'razao_social' | 'is_prospect'>): string {
  const name = (p.nome_fantasia?.trim() || p.razao_social || '').trim();
  return p.is_prospect ? `${name} (prospect)` : name;
}

function optionMeta(p: Parceiro): string | null {
  const parts: string[] = [];
  if (p.cnpj_cpf) parts.push(formatCnpjCpf(p.cnpj_cpf));
  if (p.municipio) {
    parts.push(p.uf ? `${p.municipio}/${p.uf}` : p.municipio);
  }
  if (p.is_prospect && !p.cnpj_cpf) {
    parts.push('prospect');
  }
  return parts.length ? parts.join(' · ') : null;
}

function selectedLabel(p: Parceiro): string {
  return `${p.codigo} — ${displayName(p)}`;
}

function SelectedSummary({ parceiro }: { parceiro: Parceiro }) {
  const meta = optionMeta(parceiro);
  return (
    <p className="parceiro-vinculo" style={{ margin: '0.35rem 0 0' }}>
      Selecionado:{' '}
      <strong>
        {parceiro.codigo} — {displayName(parceiro)}
      </strong>
      {meta ? ` · ${meta}` : ''}
    </p>
  );
}

async function searchParceiros(papel: ParceiroPapelFiltro | undefined, q: string): Promise<Parceiro[]> {
  const qs = new URLSearchParams();
  if (papel) qs.set('papel', papel);
  if (q.trim()) qs.set('q', q.trim());
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await api.get<{ data: Parceiro[] }>(`/parceiros${suffix}`);
  return res.data;
}

/**
 * Typeahead de PAR — busca server-side (código, nome, CNPJ, contato).
 * Padrão alinhado ao FiscalCombobox; evita `<select>` com listagem longa.
 */
export function ParceiroCombobox({
  label,
  value,
  onChange,
  papel,
  disabled = false,
  required = false,
  placeholder = 'Buscar por nome, código ou CNPJ…',
  hint,
  className,
  emptyMessage = 'Nenhum cadastro encontrado. Ajuste o termo ou cadastre o parceiro.',
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const blurTimer = useRef<number | null>(null);

  const displayValue = open ? query : value ? selectedLabel(value) : '';

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const rows = await searchParceiros(papel, q);
        setOptions(rows);
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [papel],
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

  const selectOption = (p: Parceiro) => {
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
              {query.trim() ? emptyMessage : 'Digite para filtrar · ou navegue nos primeiros resultados.'}
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

      {value && !open ? (
        <SelectedSummary parceiro={value} />
      ) : null}

      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
