import type { ReactNode } from 'react';
import type { FacaPosicaoCodigo } from '../lib/facaPosicao';
import { FacaPosicaoSelector } from './FacaPosicaoSelector';

type Props = {
  visual: ReactNode;
  value: FacaPosicaoCodigo | '';
  onChange: (value: FacaPosicaoCodigo | '') => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  hint?: string;
  className?: string;
};

/**
 * Silhueta da faca + seletor ↑ ↓ ← → encostado à direita (padrão operacional ORC / mapa).
 */
export function FacaSilhuetaPosicaoDock({
  visual,
  value,
  onChange,
  disabled,
  id,
  label = 'Posição',
  hint,
  className,
}: Props) {
  return (
    <div className={`faca-silhueta-posicao${className ? ` ${className}` : ''}`}>
      <div className="faca-silhueta-posicao__visual">{visual}</div>
      <aside className="faca-silhueta-posicao__dock" aria-labelledby={id ? `${id}-label` : undefined}>
        <span id={id ? `${id}-label` : undefined} className="faca-silhueta-posicao__dock-label">
          {label}
        </span>
        <FacaPosicaoSelector
          id={id}
          variant="dock"
          showHint={false}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        {hint ? <p className="faca-silhueta-posicao__dock-hint">{hint}</p> : null}
      </aside>
    </div>
  );
}
