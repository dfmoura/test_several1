type Props = {
  value: string;
  onChange: (next: string) => void;
  total: number;
  visiveis: number;
  id?: string;
  /** No overlay de A buscar o foco fica no QR — filtro sem autoFocus. */
  autoFocus?: boolean;
};

/**
 * Um campo — lote desta bobina (código / NF), local, L×C, m².
 */
export function OpFiltroVolumes({
  value,
  onChange,
  total,
  visiveis,
  id = 'op-filtro-vols',
  autoFocus = true,
}: Props) {
  if (total < 1) return null;
  return (
    <div className="form-group op-escolha__filtro">
      <label htmlFor={id}>Filtrar por lote</label>
      <div className="op-escolha__filtro-row">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Lote FLM-ENS-A, ENS-B, local…"
          autoComplete="off"
          autoFocus={autoFocus}
        />
        {value.trim() ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange('')}>
            Limpar
          </button>
        ) : null}
      </div>
      <p className="muted" style={{ margin: '0.35rem 0 0' }}>
        {value.trim() ? `${visiveis} de ${total}` : `${total} ${total === 1 ? 'bobina' : 'bobinas'}`}
      </p>
    </div>
  );
}
