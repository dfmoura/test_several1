import type { OpRetiradaVolume } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import {
  areaM2Volume,
  formatMetrosLineares,
  formatQtdePick,
  formatVolumeDimensao,
  type VolumePickMarca,
  type VolumePickModo,
} from '../lib/producaoPick';

type Props = {
  marcas: VolumePickMarca[];
  volDo: (loteId: number) => OpRetiradaVolume | undefined;
  busy?: boolean;
  /** `snapshot` = revenda (sem MOV); `debita` = produção (SAIDA_PRODUCAO). */
  modo?: VolumePickModo;
  /** OP: a lista pode trazer mais de um produto. Revenda fica no SKU da linha. */
  mostrarProduto?: boolean;
  /**
   * Bobina/papel: Dimensão · Área · Rolo (m). Sem coluna Quantidade —
   * a bobina sai inteira (qtde = volume).
   */
  mostrarMetragem?: boolean;
  /** Largura da pista/SKU para derivar metros quando o volume não traz comprimento. */
  larguraMmFallback?: number;
  onToggle: (loteId: number, marcado: boolean) => void;
  onQtde: (loteId: number, qtde: string) => void;
};

/**
 * Tabela canônica Levar / Local / Volume / No volume / Quantidade.
 * Com `mostrarMetragem`: Dimensão · Área · Rolo no lugar de No volume / Quantidade.
 * Usada por A separar (REV) e Ficha da OP (+ volume).
 */
export function VolumePickTable({
  marcas,
  volDo,
  busy = false,
  modo = 'snapshot',
  mostrarProduto = false,
  mostrarMetragem = false,
  larguraMmFallback = 0,
  onToggle,
  onQtde,
}: Props) {
  if (marcas.length === 0) {
    return <p className="muted">Nenhum volume com saldo para este produto.</p>;
  }

  return (
    <div className="table-wrap" data-pick-modo={modo} data-pick-metragem={mostrarMetragem ? '1' : '0'}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Levar</th>
            <th>Local</th>
            {mostrarProduto ? <th>Produto</th> : null}
            <th>Volume</th>
            {mostrarMetragem ? (
              <>
                <th>Dimensão</th>
                <th>Área</th>
                <th>Rolo</th>
              </>
            ) : (
              <>
                <th>No volume</th>
                <th>Quantidade</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {marcas.map((m) => {
            const vol = volDo(m.lote_id);
            const dim = vol ? formatVolumeDimensao(vol) : null;
            const area = vol ? areaM2Volume(vol) : null;
            const metros = vol ? formatMetrosLineares(vol, larguraMmFallback) : null;
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
                {mostrarProduto ? (
                  <td>
                    {vol?.sku ?? '—'}
                    {vol?.descricao ? (
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {vol.descricao}
                      </div>
                    ) : null}
                  </td>
                ) : null}
                <td>{vol?.codigo ?? '—'}</td>
                {mostrarMetragem ? (
                  <>
                    <td>
                      {dim ?? '—'}
                      {metros && dim ? (
                        <div className="muted" style={{ fontSize: '0.85em' }}>
                          {metros} de rolo
                        </div>
                      ) : null}
                    </td>
                    <td>{area != null ? formatQtdePick(area, 'm²') : '—'}</td>
                    <td>{metros ?? '—'}</td>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
