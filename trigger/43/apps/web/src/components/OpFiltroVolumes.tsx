type Props = {
  value: string;
  onChange: (next: string) => void;
  total: number;
  visiveis: number;
  id?: string;
};

/**
 * Um campo — lote, código, local, L×C, m², validade, status.
 * Some se só houver uma bobina.
 */
export function OpFiltroVolumes({ value, onChange, total, visiveis, id = 'op-filtro-vols' }: Props) {
  if (total < 2) return null;
  return (
    <div className="form-group op-escolha__filtro">
      <label htmlFor={id}>Filtrar</label>
      <div className="op-escolha__filtro-row">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Lote, metro linear, local, mm, m², validade…"
          autoComplete="off"
          autoFocus
        />
        {value.trim() ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange('')}>
            Limpar
          </button>
        ) : null}
      </div>
      <p className="muted" style={{ margin: '0.35rem 0 0' }}>
        {value.trim() ? `${visiveis} de ${total}` : `${total} bobinas`}
      </p>
    </div>
  );
}
