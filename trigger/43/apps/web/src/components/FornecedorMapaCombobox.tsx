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

type Props = {
  label?: string;
  value: string;
  onChange: (fornecedor: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
  emptyMessage?: string;
};

function displayName(p: Parceiro): string {
  return (p.nome_fantasia?.trim() || p.razao_social || '').trim();
}

function optionMeta(p: Parceiro): string | null {
  const parts: string[] = [];
  if (p.cnpj_cpf) parts.push(formatCnpjCpf(p.cnpj_cpf));
  if (p.municipio) {
    parts.push(p.uf ? `${p.municipio}/${p.uf}` : p.municipio);
  }
  return parts.length ? parts.join(' · ') : null;
}

function selectedLabel(p: Parceiro): string {
  return `${p.codigo} — ${displayName(p)}`;
}

function fornecedorFromParceiro(p: Parceiro): string {
  return displayName(p);
}

async function searchFornecedores(q: string): Promise<Parceiro[]> {
  const qs = new URLSearchParams({ papel: 'fornecedor' });
  if (q.trim()) qs.set('q', q.trim());
  const res = await api.get<{ data: Parceiro[] }>(`/parceiros?${qs}`);
  return res.data;
}

function resolveParceiro(value: string, rows: Parceiro[]): Parceiro | null {
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  return (
    rows.find((p) => {
      const name = displayName(p).toLowerCase();
      return (
        name === needle ||
        p.codigo.toLowerCase() === needle ||
        p.razao_social.trim().toLowerCase() === needle ||
        (p.nome_fantasia?.trim().toLowerCase() ?? '') === needle
      );
    }) ?? null
  );
}

/**
 * Busca de fornecedor para o mapa de facas — reutiliza PAR com papel fornecedor.
 * Persiste o rótulo em `orc_mapa_facas.fornecedor` (texto legado preservado).
 */
export function FornecedorMapaCombobox({
  label = 'Fornecedor',
  value,
  onChange,
  disabled = false,
  placeholder = 'Buscar fornecedor por nome, código ou CNPJ…',
  hint = 'PAR com papel fornecedor · busca no cadastro de parceiros.',
  className,
  emptyMessage = 'Nenhum fornecedor encontrado. Cadastre em Parceiros com papel fornecedor.',
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [linked, setLinked] = useState<Parceiro | null>(null);
  const debounceRef = useRef<number | null>(null);
  const blurTimer = useRef<number | null>(null);

  const trimmed = value.trim();
  const displayValue = open ? query : linked ? selectedLabel(linked) : trimmed;

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const rows = await searchFornecedores(q);
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

  useEffect(() => {
    if (!trimmed) {
      setLinked(null);
      return;
    }
    let cancelled = false;
    void searchFornecedores(trimmed).then((rows) => {
      if (cancelled) return;
      setLinked(resolveParceiro(trimmed, rows));
    });
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

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
    onChange(fornecedorFromParceiro(p));
    setLinked(p);
    setOpen(false);
    setQuery('');
  };

  const clearSelection = () => {
    onChange('');
    setLinked(null);
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
      <label>{label}</label>
      <div
        className={`fiscal-combo-control${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
      >
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          autoComplete="off"
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            openAndSearch(linked ? '' : trimmed);
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
          {trimmed && !disabled && (
            <button
              type="button"
              className="fiscal-combo-icon-btn"
              title="Limpar"
              aria-label="Limpar fornecedor"
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

      {linked && !open ? (
        <p className="parceiro-vinculo" style={{ margin: '0.35rem 0 0' }}>
          Vinculado:{' '}
          <strong>
            {linked.codigo} — {displayName(linked)}
          </strong>
          {optionMeta(linked) ? ` · ${optionMeta(linked)}` : ''}
        </p>
      ) : trimmed && !linked && !open ? (
        <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
          Rótulo legado do mapa: <strong>{trimmed}</strong> · busque um fornecedor cadastrado para
          atualizar.
        </p>
      ) : null}

      {hint && !trimmed ? <span className="form-hint">{hint}</span> : null}
    </div>
  );
}
