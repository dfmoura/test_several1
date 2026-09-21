import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import {
  commitNumericDraft,
  formatNumericCommitted,
  sanitizeNumericDraft,
} from '../lib/numericDraft';

type Base = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'inputMode'
>;

export type NumericInputProps = Base & {
  value: number | '' | null | undefined;
  /** Gravado no blur / Enter. */
  onCommit: (value: number | '') => void;
  /**
   * Valor commitado quando o campo fica vazio no blur.
   * Omitir → grava `''` (campo opcional). Use `0`/`1` quando o domínio exige número.
   */
  emptyCommit?: number | '';
  /** Exibe vazio quando o valor commitado é 0 (ex.: gordura / frete opcional). */
  blankZero?: boolean;
  integer?: boolean;
  allowNegative?: boolean;
  /** Seleciona o texto ao focar — troca rápida sem lutar com o zero. Default true. */
  selectOnFocus?: boolean;
};

/**
 * Input numérico com draft local: Backspace esvazia; min/max/default só no blur/Enter.
 * Usa `text` + `inputMode` (evita quirks de `type=number`).
 */
export function NumericInput({
  value,
  onCommit,
  emptyCommit,
  blankZero = false,
  integer = false,
  allowNegative = false,
  selectOnFocus = true,
  min,
  max,
  disabled,
  onFocus,
  onBlur,
  onKeyDown,
  id,
  ...rest
}: NumericInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const focusedRef = useRef(false);
  const [draft, setDraft] = useState(() =>
    formatNumericCommitted(value, { blankZero }),
  );

  const minN = min != null && min !== '' ? Number(min) : undefined;
  const maxN = max != null && max !== '' ? Number(max) : undefined;

  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(formatNumericCommitted(value, { blankZero }));
  }, [value, blankZero]);

  const flush = (raw: string) => {
    const next = commitNumericDraft(raw, {
      emptyCommit,
      integer,
      allowNegative,
      min: Number.isFinite(minN) ? minN : undefined,
      max: Number.isFinite(maxN) ? maxN : undefined,
    });
    onCommit(next);
    setDraft(formatNumericCommitted(next, { blankZero }));
    return next;
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    focusedRef.current = true;
    onFocus?.(e);
    if (selectOnFocus) {
      requestAnimationFrame(() => e.target.select());
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    focusedRef.current = false;
    flush(e.target.value);
    onBlur?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      flush(e.currentTarget.value);
      e.currentTarget.blur();
    }
    onKeyDown?.(e);
  };

  return (
    <input
      {...rest}
      id={inputId}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      disabled={disabled}
      value={draft}
      min={min}
      max={max}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onChange={(e) => {
        setDraft(
          sanitizeNumericDraft(e.target.value, { integer, allowNegative }),
        );
      }}
    />
  );
}
