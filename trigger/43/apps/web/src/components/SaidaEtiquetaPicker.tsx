import {
  SAIDA_ETIQUETA_OPCOES,
  type SaidaEtiquetaCodigo,
} from '../lib/saidaEtiqueta';

type Props = {
  value: SaidaEtiquetaCodigo | '';
  onChange: (value: SaidaEtiquetaCodigo | '') => void;
  disabled?: boolean;
  id?: string;
  /** compacta — cabe na grade da especificação técnica (após Gordura). */
  variante?: 'padrao' | 'compacta';
};

/**
 * Faixa das 4 saídas de bobina (ADR_ORC_SAIDA_ETIQUETA).
 * Uma opção exclusiva — não altera preço.
 */
export function SaidaEtiquetaPicker({
  value,
  onChange,
  disabled,
  id,
  variante = 'padrao',
}: Props) {
  const current = value || '';
  const compacta = variante === 'compacta';
  return (
    <div
      className={`saida-etiqueta-picker${compacta ? ' saida-etiqueta-picker--compacta' : ''}`}
      role="radiogroup"
      aria-labelledby={id ? `${id}-label` : 'saida-etiqueta-label'}
      data-testid="saida-etiqueta-picker"
    >
      <div className="saida-etiqueta-picker__grid">
        {SAIDA_ETIQUETA_OPCOES.map((opt) => {
          const active = current === opt.codigo;
          return (
            <button
              key={opt.codigo}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.rotulo}
              title={opt.rotulo}
              className={`saida-etiqueta-picker__card${active ? ' is-active' : ''}`}
              disabled={disabled}
              onClick={() => onChange(active ? '' : opt.codigo)}
            >
              <span className="saida-etiqueta-picker__frame">
                <img
                  src={opt.asset}
                  alt=""
                  className="saida-etiqueta-picker__img"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </span>
              <span className="saida-etiqueta-picker__rotulo">{opt.rotuloCurto}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
