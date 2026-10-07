import type { OpRetiradaVolume } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import type { VolumePickMarca, VolumePickModo } from '../lib/producaoPick';

type Props = {
  marcas: VolumePickMarca[];
  volDo: (loteId: number) => OpRetiradaVolume | undefined;
  busy?: boolean;
  /** `snapshot` = revenda (sem MOV); `debita` = produção (SAIDA_PRODUCAO). */
  modo?: VolumePickModo;
  onToggle: (loteId: number, marcado: boolean) => void;
  onQtde: (loteId: number, qtde: string) => void;
};

/**
 * Tabela canônica Levar / Local / Volume / No volume / Quantidade.
 * Usada por A separar (REV). A buscar (OP) permanece no kit multi-linha até adoção futura.
 */
export function VolumePickTable({
  marcas,
  volDo,
  busy = false,
  modo = 'snapshot',
  onToggle,
  onQtde,
}: Props) {
  if (marcas.length === 0) {
    return <p className="muted">Nenhum volume com saldo para este produto.</p>;
  }

  return (
    <div className="table-wrap" data-pick-modo={modo}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Levar</th>
            <th>Local</th>
            <th>Volume</th>
            <th>No volume</th>
            <th>Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {marcas.map((m) => {
            const vol = volDo(m.lote_id);
            return (
              <tr key={m.lote_id}>
                <td>
                  <input
                    type="checkbox"
                    checked={m.marcado}
                    disabled={busy}
                    aria-label={`Levar volume ${vol?.codigo ?? m.lote_id}`}
                    onChange={(e) => onToggle(m.lote_id, e.target.checked)}
                  />
                  {m.lido ? (
                    <span className="muted" style={{ marginLeft: 6, fontSize: '0.85em' }}>
                      QR
                    </span>
                  ) : null}
                </td>
                <td>{vol?.endereco?.codigo ?? '—'}</td>
                <td>{vol?.codigo ?? '—'}</td>
                <td>
                  {vol?.qtde_volume != null
                    ? `${formatDecimalBr(vol.qtde_volume, 4, { stripTrailingZeros: true })} ${vol.unidade ?? ''}`
                    : '—'}
                </td>
                <td>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={m.qtde}
                    disabled={busy || !m.marcado}
                    aria-label={`Quantidade do volume ${vol?.codigo ?? m.lote_id}`}
                    onChange={(e) => onQtde(m.lote_id, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
