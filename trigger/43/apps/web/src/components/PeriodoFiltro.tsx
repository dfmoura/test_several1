import { useEffect, useId, useRef, useState } from 'react';
import { IconFiltro } from './NavIcons';
import {
  currentYearRange,
  hasPeriodo,
  periodoFiltroResumo,
  periodoPresetLabel,
  previousYearRange,
  resolvePeriodoPreset,
  type PeriodoPreset,
  type PeriodoRange,
} from '../lib/periodo';

type PeriodoFiltroProps = {
  idPrefix: string;
  de: string;
  ate: string;
  /** Atualiza De/Até no pai (sem recarregar). */
  onChange: (next: PeriodoRange) => void;
  /** Aplica o período e recarrega a lista. */
  onApply: (next: PeriodoRange) => void;
};

const PRESETS: PeriodoPreset[] = ['tudo', 'ano_atual', 'ano_anterior', 'intervalo'];

function rangeForPreset(preset: PeriodoPreset, current: PeriodoRange): PeriodoRange {
  if (preset === 'tudo') return { de: '', ate: '' };
  if (preset === 'ano_atual') return currentYearRange();
  if (preset === 'ano_anterior') return previousYearRange();
  return current;
}

/**
 * Filtro de período discreto para listagens operacionais.
 * Default do produto nestas telas = tudo (sem `de`/`ate`).
 */
export function PeriodoFiltro({ idPrefix, de, ate, onChange, onApply }: PeriodoFiltroProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<PeriodoPreset>(() => resolvePeriodoPreset(de, ate));
  const ativo = hasPeriodo(de, ate);
  const resumo = periodoFiltroResumo(de, ate);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const escolher = (preset: PeriodoPreset) => {
    setModo(preset);
    if (preset === 'intervalo') {
      setOpen(true);
      return;
    }
    const next = rangeForPreset(preset, { de, ate });
    onChange(next);
    onApply(next);
    setOpen(false);
  };

  const aplicarIntervalo = () => {
    setModo('intervalo');
    onApply({ de, ate });
    setOpen(false);
  };

  const mostrarIntervalo = open && modo === 'intervalo';

  return (
    <div className="periodo-filtro" ref={rootRef}>
      <button
        type="button"
        className={`btn-icon periodo-filtro__btn${ativo ? ' is-active' : ''}`}
        aria-label={resumo}
        title={resumo}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          if (!open) setModo(resolvePeriodoPreset(de, ate));
          setOpen(!open);
        }}
      >
        <IconFiltro />
      </button>

      {open ? (
        <div className="periodo-filtro__menu" id={menuId} role="menu" aria-label="Período">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="menuitemradio"
              aria-checked={modo === preset}
              className={`periodo-filtro__item${modo === preset ? ' is-selected' : ''}`}
              onClick={() => escolher(preset)}
            >
              {periodoPresetLabel(preset)}
            </button>
          ))}

          {mostrarIntervalo ? (
            <div className="periodo-filtro__intervalo">
              <div className="form-group">
                <label htmlFor={`${idPrefix}-de`}>De</label>
                <input
                  id={`${idPrefix}-de`}
                  type="date"
                  value={de}
                  onChange={(e) => {
                    setModo('intervalo');
                    onChange({ de: e.target.value, ate });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      aplicarIntervalo();
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor={`${idPrefix}-ate`}>Até</label>
                <input
                  id={`${idPrefix}-ate`}
                  type="date"
                  value={ate}
                  onChange={(e) => {
                    setModo('intervalo');
                    onChange({ de, ate: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      aplicarIntervalo();
                    }
                  }}
                />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={aplicarIntervalo}>
                Aplicar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
