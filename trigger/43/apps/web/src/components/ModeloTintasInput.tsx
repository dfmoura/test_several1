import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import {
  normalizeTintas,
  splitTintasDraft,
  TINTAS_MAX_POR_MODELO,
} from '../lib/modeloTintas';

type Props = {
  value?: string[] | null;
  onChange: (tintas: string[]) => void;
  disabled?: boolean;
  'aria-label'?: string;
};

/**
 * Campo de tags: Enter / vírgula / Tab confirma; Backspace no vazio remove a última.
 */
export function ModeloTintasInput({
  value,
  onChange,
  disabled = false,
  'aria-label': ariaLabel = 'Cores da arte',
}: Props) {
  const tintas = normalizeTintas(value);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const atMax = tintas.length >= TINTAS_MAX_POR_MODELO;

  const commit = (raw: string) => {
    const pieces = splitTintasDraft(raw);
    if (pieces.length === 0) return;
    onChange(normalizeTintas([...tintas, ...pieces]));
    setDraft('');
  };

  const removeAt = (index: number) => {
    onChange(tintas.filter((_, i) => i !== index));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
      return;
    }
    if (e.key === 'Tab' && draft.trim()) {
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === 'Backspace' && draft === '' && tintas.length > 0) {
      e.preventDefault();
      onChange(tintas.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text || !/[,;\n]/.test(text)) return;
    e.preventDefault();
    commit(`${draft}${text}`);
  };

  return (
    <div
      className={`modelo-tintas-input${disabled ? ' is-disabled' : ''}${atMax ? ' is-max' : ''}`}
      onClick={() => {
        if (!disabled) inputRef.current?.focus();
      }}
    >
      {tintas.map((nome, i) => (
        <span key={`${nome}-${i}`} className="modelo-tinta-tag modelo-tinta-tag--edit">
          <span className="modelo-tinta-tag__label">{nome}</span>
          {disabled ? null : (
            <button
              type="button"
              className="modelo-tinta-tag__remove"
              aria-label={`Remover cor ${nome}`}
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        className="modelo-tintas-input__field"
        value={draft}
        maxLength={40}
        disabled={disabled || atMax}
        placeholder={tintas.length === 0 ? 'Pantone 185, Preto…' : atMax ? '' : 'Outra cor'}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
      />
    </div>
  );
}
