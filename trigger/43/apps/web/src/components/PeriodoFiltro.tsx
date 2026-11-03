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

function resumoBotao(modo: PeriodoPreset, de: string, ate: string): string {
  if (modo === 'intervalo' && !hasPeriodo(de, ate)) return 'Período: intervalo';
  return periodoFiltroResumo(de, ate);
}

/**
 * Filtro de período discreto para listagens operacionais.
 * Default = tudo. Menu só com presets; Intervalo revela De/Até na barra.
 */
export function PeriodoFiltro({ idPrefix, de, ate, onChange, onApply }: PeriodoFiltroProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const deRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<PeriodoPreset>(() => resolvePeriodoPreset(de, ate));
  const ativo = hasPeriodo(de, ate) || modo === 'intervalo';
  const resumo = resumoBotao(modo, de, ate);
  const mostrarIntervalo = modo === 'intervalo';

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
    if (preset === 'intervalo') {
      setModo('intervalo');
      setOpen(false);
      window.setTimeout(() => deRef.current?.focus(), 0);
      return;
    }
    setModo(preset);
    const next = rangeForPreset(preset, { de, ate });
    onChange(next);
    onApply(next);
    setOpen(false);
  };

  const abrirMenu = () => {
    if (!open) {
      const resolved = resolvePeriodoPreset(de, ate);
      // Intervalo sem datas ainda é intervalo (não colapsa para "tudo").
      setModo(resolved === 'tudo' && modo === 'intervalo' ? 'intervalo' : resolved);
    }
    setOpen(!open);
  };

  return (
    <div className="periodo-filtro" ref={rootRef}>
      {mostrarIntervalo ? (
        <div className="periodo-filtro__intervalo">
          <div className="form-group">
            <label htmlFor={`${idPrefix}-de`}>De</label>
            <input
              ref={deRef}
              id={`${idPrefix}-de`}
              type="date"
              value={de}
              onChange={(e) => onChange({ de: e.target.value, ate })}
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${idPrefix}-ate`}>Até</label>
            <input
              id={`${idPrefix}-ate`}
              type="date"
              value={ate}
              onChange={(e) => onChange({ de, ate: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={`btn-icon periodo-filtro__btn${ativo ? ' is-active' : ''}`}
        aria-label={resumo}
        title={resumo}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={abrirMenu}
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
        </div>
      ) : null}
    </div>
  );
}
