import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { api, type Parceiro, type ParceiroVinculo } from '../lib/api';
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
  value: ParceiroVinculo | null;
  onChange: (parceiro: Parceiro | null) => void;
  papel?: ParceiroPapelFiltro;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
  emptyMessage?: string;
  /** Resumo abaixo do campo (padrão). Desligar em linhas densas. */
  showSummary?: boolean;
  /**
   * Lista em portal (position:fixed) — evita corte por overflow de tabela/scroll.
   * Padrão: true (grade de volumes, formulários densos).
   */
  portalList?: boolean;
};

function displayName(p: ParceiroVinculo): string {
  const name = (p.nome_fantasia?.trim() || p.razao_social || '').trim();
  return p.is_prospect ? `${name} (prospect)` : name;
}

function optionMeta(p: ParceiroVinculo): string | null {
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

function selectedLabel(p: ParceiroVinculo): string {
  return `${p.codigo} — ${displayName(p)}`;
}

function SelectedSummary({ parceiro }: { parceiro: ParceiroVinculo }) {
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

const LIST_MAX_H = 280;
const LIST_MIN_H = 120;
const LIST_GAP = 4;

function measurePortalListStyle(control: HTMLElement): CSSProperties {
  const r = control.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom - LIST_GAP;
  const spaceAbove = r.top - LIST_GAP;
  const openUp = spaceBelow < Math.min(LIST_MAX_H, 160) && spaceAbove > spaceBelow;
  const available = openUp ? spaceAbove : spaceBelow;
  const maxHeight = Math.min(LIST_MAX_H, Math.max(LIST_MIN_H, available));
  const width = Math.min(Math.max(r.width, 280), Math.max(window.innerWidth - 16, 200));
  let left = r.left;
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }
  return {
    position: 'fixed',
    left,
    width,
    maxHeight,
    zIndex: 1200,
    ...(openUp
      ? { top: 'auto', bottom: window.innerHeight - r.top + LIST_GAP }
      : { top: r.bottom + LIST_GAP, bottom: 'auto' }),
  };
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
  showSummary = true,
  portalList = true,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null);
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

  const updateListPosition = useCallback(() => {
    const el = controlRef.current;
    if (!el) return;
    setListStyle(measurePortalListStyle(el));
  }, []);

  const closeList = useCallback(() => {
    setOpen(false);
    setQuery('');
    setListStyle(null);
  }, []);

  useLayoutEffect(() => {
    if (!open || !portalList) {
      if (!open) setListStyle(null);
      return;
    }
    updateListPosition();
  }, [open, portalList, options.length, loading, updateListPosition]);

  useEffect(() => {
    if (!open || !portalList) return;
    const onReposition = () => updateListPosition();
    window.addEventListener('resize', onReposition);
    // capture: scroll em .oc-volumes-scroll / painel também reposiciona
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, portalList, updateListPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (rootRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      closeList();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, closeList]);

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
    closeList();
  };

  const clearSelection = () => {
    onChange(null);
    closeList();
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
      closeList();
    }
  };

  const showPortalList = portalList && open && listStyle !== null;
  const showInlineList = !portalList && open;

  const listbox = showPortalList || showInlineList ? (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      className={`fiscal-combo-list${portalList ? ' fiscal-combo-list--portal' : ''}`}
      style={portalList ? listStyle ?? undefined : undefined}
    >
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
  ) : null;

  return (
    <div className={`form-group fiscal-combo ${className ?? ''}`} ref={rootRef}>
      <label>
        {label}
        {required ? ' *' : ''}
      </label>
      <div
        ref={controlRef}
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
            // Portal: o fechamento confiável é o pointerdown fora (lista no body).
            // Blur cobre o modo inline e Escape/tab sem clique.
            blurTimer.current = window.setTimeout(() => {
              if (portalList && listRef.current) {
                const active = document.activeElement;
                if (active && listRef.current.contains(active)) return;
              }
              closeList();
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

      {showPortalList && listbox && typeof document !== 'undefined'
        ? createPortal(listbox, document.body)
        : showInlineList
          ? listbox
          : null}

      {showSummary && value && !open ? (
        <SelectedSummary parceiro={value} />
      ) : null}

      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}
