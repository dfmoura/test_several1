import { FACA_POSICAO_OPCOES, type FacaPosicaoCodigo } from '../lib/facaPosicao';

type Props = {
  value: FacaPosicaoCodigo | '';
  onChange: (value: FacaPosicaoCodigo | '') => void;
  disabled?: boolean;
  id?: string;
  /** dock = grade 2×2 ao lado da silhueta; form = linha horizontal em formulários */
  variant?: 'dock' | 'form';
  showHint?: boolean;
};

/** Seletor ↑ ↓ ← → — posição da faca no cilindro (rv4 operacional). */
export function FacaPosicaoSelector({
  value,
  onChange,
  disabled,
  id,
  variant = 'form',
  showHint = true,
}: Props) {
  const isDock = variant === 'dock';

  return (
    <div
      className={`faca-posicao-selector faca-posicao-selector--${variant}`}
      role="group"
      aria-labelledby={id ? `${id}-label` : undefined}
    >
      {isDock ? (
        <div className="faca-posicao-dock-grid">
          {FACA_POSICAO_OPCOES.map((opt) => {
            const active = value === opt.codigo;
            return (
              <button
                key={opt.codigo}
                type="button"
                className={`faca-posicao-dock-btn${active ? ' is-active' : ''}`}
                disabled={disabled}
                title={`${opt.rotulo} (${opt.simbolo})`}
                aria-label={opt.rotulo}
                aria-pressed={active}
                onClick={() => onChange(active ? '' : opt.codigo)}
              >
                <span aria-hidden="true">{opt.simbolo}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="btn-row faca-posicao-btns">
          {FACA_POSICAO_OPCOES.map((opt) => {
            const active = value === opt.codigo;
            return (
              <button
                key={opt.codigo}
                type="button"
                className={`btn btn-sm${active ? ' btn-primary' : ' btn-secondary'}`}
                disabled={disabled}
                title={`${opt.rotulo} (${opt.simbolo})`}
                aria-pressed={active}
                onClick={() => onChange(active ? '' : opt.codigo)}
              >
                <span aria-hidden="true">{opt.simbolo}</span>
                <span className="faca-posicao-btn-label">{opt.rotulo}</span>
              </button>
            );
          })}
        </div>
      )}
      {showHint ? (
        <p className="field-note faca-posicao-hint">
          Montagem no cilindro — aparece na ficha e guia de produção. Opcional.
        </p>
      ) : null}
    </div>
  );
}
