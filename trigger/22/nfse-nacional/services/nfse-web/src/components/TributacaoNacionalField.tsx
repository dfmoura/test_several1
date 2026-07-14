import { useEffect, useId, useRef, useState } from 'react';
import { useTributacaoNacionalLookup } from '@/hooks/useTributacaoNacionalLookup';
import type { TributacaoNacionalItem } from '@/types';

function formatCodigo(codigo: string) {
  const d = codigo.replace(/\D/g, '');
  if (d.length !== 6) return codigo;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

interface TributacaoNacionalFieldProps {
  value: string;
  onChange: (codigo: string) => void;
  onSelect?: (item: TributacaoNacionalItem) => void;
  required?: boolean;
}

export function TributacaoNacionalField({
  value,
  onChange,
  onSelect,
  required,
}: TributacaoNacionalFieldProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const lookup = useTributacaoNacionalLookup();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 6) {
      void lookup.consultarCodigo(digits);
    } else {
      lookup.setSelecionado(null);
    }
  }, [value]);

  useEffect(() => {
    if (!focused) return;
    if (query.trim().length >= 2) {
      lookup.buscar(query);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [query, focused]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: TributacaoNacionalItem) => {
    onChange(item.codigo);
    lookup.setSelecionado(item);
    onSelect?.(item);
    setQuery('');
    setOpen(false);
    setFocused(false);
  };

  const displayValue = focused ? query : (value ? formatCodigo(value) : '');

  return (
    <div ref={containerRef} className="relative">
      <input
        className="input"
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value;
          setQuery(raw);
          setFocused(true);
          const digits = raw.replace(/\D/g, '');
          if (digits.length <= 6) {
            onChange(digits);
          }
        }}
        onFocus={() => {
          setFocused(true);
          setQuery(value ? formatCodigo(value) : '');
        }}
        placeholder="Ex.: 17.02.02 ou expediente administrativo"
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
      />

      {lookup.status === 'loading' && focused && (
        <p className="mt-1 text-xs text-slate-500">Consultando base nacional LC 116…</p>
      )}

      {lookup.error && (
        <p className="mt-1 text-xs text-amber-700">{lookup.error}</p>
      )}

      {lookup.selecionado && !focused && (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          <span className="font-medium text-slate-700">{formatCodigo(lookup.selecionado.codigo)}</span>
          {' — '}
          {lookup.selecionado.descricao}
        </p>
      )}

      {open && lookup.resultados.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {lookup.resultados.map((item) => (
            <li key={item.codigo} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-sky-50 focus:bg-sky-50 focus:outline-none"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <span className="font-medium text-sky-800">{formatCodigo(item.codigo)}</span>
                <span className="mt-0.5 block text-xs text-slate-600 line-clamp-2">{item.descricao}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && lookup.status === 'not_found' && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
          Nenhum código encontrado na base nacional.
        </div>
      )}
    </div>
  );
}
