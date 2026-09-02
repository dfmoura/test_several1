import type { ReactNode } from 'react';
import type { FacaPosicaoCodigo } from '../lib/facaPosicao';
import { FacaPosicaoCampo } from './FacaPosicaoCampo';

type Props = {
  visual: ReactNode;
  value: FacaPosicaoCodigo | '';
  onChange: (value: FacaPosicaoCodigo | '') => void;
  disabled?: boolean;
  id?: string;
  hint?: string;
  className?: string;
};

/**
 * Silhueta + checkbox opcional de posição ↑ ↓ ← → (padrão operacional mapa / ORC).
 * O `visual` deve usar FacaApresentacao para preview ao vivo da seta.
 */
export function FacaSilhuetaPosicaoDock({
  visual,
  value,
  onChange,
  disabled,
  id,
  hint,
  className,
}: Props) {
  return (
    <div className={`faca-silhueta-posicao${className ? ` ${className}` : ''}`}>
      <div className="faca-silhueta-posicao__visual">{visual}</div>
      <aside className="faca-silhueta-posicao__dock">
        <FacaPosicaoCampo
          id={id}
          variant="dock"
          value={value}
          onChange={onChange}
          disabled={disabled}
          checkboxLabel="Informar posição da faca"
          hint={hint}
        />
      </aside>
    </div>
  );
}
