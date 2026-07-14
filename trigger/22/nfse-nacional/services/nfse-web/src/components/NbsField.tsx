import { useEffect, useId, useRef, useState } from 'react';
import { useNbsLookup } from '@/hooks/useNbsLookup';
import type { NbsItem } from '@/types';

function formatCodigo(codigo: string) {
  const d = codigo.replace(/\D/g, '');
  if (d.length !== 9) return codigo;
  return `${d[0]}.${d.slice(1, 5)}.${d.slice(5, 7)}.${d.slice(7, 9)}`;
}

interface NbsFieldProps {
  value: string;
  codigoTribNac?: string;
  onChange: (codigo: string) => void;
  onSelect?: (item: NbsItem) => void;
}

export function NbsField({ value, codigoTribNac, onChange, onSelect }: NbsFieldProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const lookup = useNbsLookup(codigoTribNac);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 9) {
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
    } else if (codigoTribNac?.replace(/\D/g, '').length === 6) {
      void lookup.carregarSugestoes().then(() => setOpen(true));
    } else {
      setOpen(false);
    }
  }, [query, focused, codigoTribNac]);

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

  const handleSelect = (item: NbsItem) => {
    onChange(item.codigo);
    lookup.setSelecionado(item);
    onSelect?.(item);
    setQuery('');
    setOpen(false);
    setFocused(false);
  };

  const displayValue = focused ? query : value ? formatCodigo(value) : '';

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
          if (digits.length <= 9) {
            onChange(digits);
          }
        }}
        onFocus={() => {
          setFocused(true);
          setQuery(value ? formatCodigo(value) : '');
        }}
        placeholder="Ex.: 1.1806.40.00 ou apoio administrativo"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
      />

      {lookup.status === 'loading' && focused && (
        <p className="mt-1 text-xs text-slate-500">Consultando base oficial NBS…</p>
      )}

      {lookup.error && <p className="mt-1 text-xs text-amber-700">{lookup.error}</p>}

      {lookup.selecionado && !focused && (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          <span className="font-medium text-slate-700">
            {formatCodigo(lookup.selecionado.codigo)}
          </span>
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
          Nenhum código NBS encontrado na base oficial.
        </div>
      )}
    </div>
  );
}
