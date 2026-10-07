import type { OpRetiradaVolume } from '../lib/api';
import { volumePassaFiltro, volumeSugerido } from '../lib/producaoPick';

export type VolumeFiltroEstado = {
  q: string;
  local: string;
  nf: string;
  soSugeridos: boolean;
  soComLocal: boolean;
};

export const VOLUME_FILTRO_VAZIO: VolumeFiltroEstado = {
  q: '',
  local: '',
  nf: '',
  soSugeridos: false,
  soComLocal: false,
};

export function volumeFiltroAtivo(f: VolumeFiltroEstado): boolean {
  return Boolean(
    f.q.trim() || f.local.trim() || f.nf.trim() || f.soSugeridos || f.soComLocal,
  );
}

/** Aplica busca ampla + local + NF + chips (sugeridos / com local). */
export function filtrarVolumesEscolha(
  vols: OpRetiradaVolume[],
  f: VolumeFiltroEstado,
): OpRetiradaVolume[] {
  const localQ = f.local.trim().toLowerCase();
  const nfQ = f.nf.trim().toLowerCase();
  return vols.filter((v) => {
    if (!volumePassaFiltro(v, f.q)) return false;
    if (localQ) {
      const end = (v.endereco?.codigo ?? '').toLowerCase();
      if (!end.includes(localQ)) return false;
    }
    if (nfQ) {
      const nf = (v.nf_numero ?? '').toLowerCase();
      if (!nf.includes(nfQ)) return false;
    }
    if (f.soSugeridos && !volumeSugerido(v)) return false;
    if (f.soComLocal && !(v.endereco?.codigo ?? '').trim()) return false;
    return true;
  });
}

type Props = {
  value: VolumeFiltroEstado;
  onChange: (next: VolumeFiltroEstado) => void;
  total: number;
  visiveis: number;
  idPrefix?: string;
  /** No overlay de A buscar o foco fica no QR — busca sem autoFocus. */
  autoFocus?: boolean;
};

/**
 * Barra de busca do overlay de volumes — campo amplo + local + NF + chips.
 */
export function OpFiltroVolumes({
  value,
  onChange,
  total,
  visiveis,
  idPrefix = 'op-filtro',
  autoFocus = true,
}: Props) {
  if (total < 1) return null;

  const set = (patch: Partial<VolumeFiltroEstado>) => onChange({ ...value, ...patch });
  const ativo = volumeFiltroAtivo(value);

  return (
    <div className="op-escolha__filtro" role="search">
      <div className="op-escolha__filtro-grid">
        <div className="form-group op-escolha__filtro-busca">
          <label htmlFor={`${idPrefix}-q`}>Buscar</label>
          <input
            id={`${idPrefix}-q`}
            value={value.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Lote, SKU, L×C, descrição…"
            autoComplete="off"
            autoFocus={autoFocus}
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-local`}>Local</label>
          <input
            id={`${idPrefix}-local`}
            value={value.local}
            onChange={(e) => set({ local: e.target.value })}
            placeholder="P02, P00000001…"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${idPrefix}-nf`}>NF</label>
          <input
            id={`${idPrefix}-nf`}
            value={value.nf}
            onChange={(e) => set({ nf: e.target.value })}
            placeholder="Número da NF"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="op-escolha__filtro-chips">
        <label className={`op-escolha__chip${value.soSugeridos ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={value.soSugeridos}
            onChange={(e) => set({ soSugeridos: e.target.checked })}
          />
          Só sugeridos (FEFO)
        </label>
        <label className={`op-escolha__chip${value.soComLocal ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={value.soComLocal}
            onChange={(e) => set({ soComLocal: e.target.checked })}
          />
          Só com local
        </label>
        {ativo ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onChange(VOLUME_FILTRO_VAZIO)}
          >
            Limpar filtros
          </button>
        ) : null}
        <span className="op-escolha__filtro-count muted">
          {ativo ? `${visiveis} de ${total}` : `${total} ${total === 1 ? 'volume' : 'volumes'}`}
        </span>
      </div>
    </div>
  );
}
