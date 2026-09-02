import { useEffect, useId, useState } from 'react';
import { isFacaPosicao, type FacaPosicaoCodigo } from '../lib/facaPosicao';
import { FacaPosicaoSelector } from './FacaPosicaoSelector';

type Props = {
  value: FacaPosicaoCodigo | '';
  onChange: (value: FacaPosicaoCodigo | '') => void;
  disabled?: boolean;
  id?: string;
  /** form = botões horizontais; dock = grade 2×2 ao lado da silhueta */
  variant?: 'form' | 'dock';
  className?: string;
  /** Texto do checkbox (padrão operacional do mapa) */
  checkboxLabel?: string;
  hint?: string;
};

/**
 * Posição da faca no cilindro — opcional.
 * Checkbox «deseja informar» → revela ↑ ↓ ← →. Desmarcar limpa o valor.
 * Útil sobretudo em RETA / REDONDA / OVAL (silhueta paramétrica sem SVG).
 */
export function FacaPosicaoCampo({
  value,
  onChange,
  disabled,
  id: idProp,
  variant = 'form',
  className,
  checkboxLabel = 'Deseja informar a posição da faca',
  hint = 'Montagem no cilindro (↑ ↓ ← →). A seta cobre a área da silhueta no mapa e no orçamento. Opcional.',
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [aberto, setAberto] = useState(() => isFacaPosicao(value));

  useEffect(() => {
    if (isFacaPosicao(value)) setAberto(true);
  }, [value]);

  const toggle = (on: boolean) => {
    setAberto(on);
    if (!on) onChange('');
  };

  return (
    <div
      className={`faca-posicao-campo faca-posicao-campo--${variant}${className ? ` ${className}` : ''}`}
    >
      <label className={`faca-posicao-campo__check${aberto ? ' is-on' : ''}`} htmlFor={`${id}-opt`}>
        <input
          id={`${id}-opt`}
          type="checkbox"
          checked={aberto}
          disabled={disabled}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span>{checkboxLabel}</span>
      </label>

      {aberto ? (
        <div className="faca-posicao-campo__chooser">
          <FacaPosicaoSelector
            id={id}
            variant={variant}
            showHint={false}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
          {hint ? <p className="faca-posicao-campo__hint">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
