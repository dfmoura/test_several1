import { areaM2FromFaixaOc } from '../lib/format';
import {
  emptyOcFaixa,
  type OcFaixaForm,
} from '../lib/ocComposicaoVolumes';

type Props = {
  composicao: OcFaixaForm[];
  disabled?: boolean;
  onChange: (next: OcFaixaForm[]) => void;
  /** Se true, tipografia/padding reduzidos (A repor). */
  compact?: boolean;
};

/**
 * Detalhe do pedido (L × bobinas × metragem) — mesmo painel da OC e de A repor.
 * Não escreve estoque; só monta composição que a OC persiste em `ordem_compra_item_composicoes`.
 */
export function OcPedidoComposicaoPanel({
  composicao,
  disabled = false,
  onChange,
  compact = false,
}: Props) {
  const temComposicao = composicao.length > 0;

  const patchFaixa = (faixaIdx: number, patch: Partial<OcFaixaForm>) => {
    const next = composicao.map((f, i) => (i === faixaIdx ? { ...f, ...patch } : f));
    onChange(next);
  };

  return (
    <div className={`oc-volumes-panel${compact ? ' oc-volumes-panel--compact' : ''}`}>
      <div className="oc-volumes-panel__bar">
        <strong>
          Detalhe do pedido
          {temComposicao ? ` (${composicao.length})` : ''}
        </strong>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled}
          onClick={() => onChange([...composicao, emptyOcFaixa()])}
        >
          + faixa
        </button>
      </div>
      {temComposicao ? (
        <div className="oc-volumes-scroll">
          <table className="oc-volumes-table">
            <thead>
              <tr>
                <th className="col-idx">#</th>
                <th className="col-num">Largura mm</th>
                <th className="col-num">Qtd bobinas</th>
                <th className="col-num">Comp. m</th>
                <th className="col-num">m²</th>
                <th className="col-acoes" />
              </tr>
            </thead>
            <tbody>
              {composicao.map((faixa, fIdx) => {
                const area = areaM2FromFaixaOc(
                  faixa.largura_mm,
                  faixa.quantidade,
                  faixa.comprimento_m,
                );
                return (
                  <tr key={`fx-${fIdx}`}>
                    <td className="col-idx">{fIdx + 1}</td>
                    <td className="col-num">
                      <input
                        inputMode="decimal"
                        required
                        disabled={disabled}
                        placeholder="110"
                        value={faixa.largura_mm}
                        onChange={(e) => patchFaixa(fIdx, { largura_mm: e.target.value })}
                      />
                    </td>
                    <td className="col-num">
                      <input
                        inputMode="decimal"
                        required
                        disabled={disabled}
                        placeholder="9"
                        value={faixa.quantidade}
                        onChange={(e) => patchFaixa(fIdx, { quantidade: e.target.value })}
                      />
                    </td>
                    <td className="col-num">
                      <input
                        inputMode="decimal"
                        required
                        disabled={disabled}
                        placeholder="1000"
                        value={faixa.comprimento_m}
                        onChange={(e) =>
                          patchFaixa(fIdx, { comprimento_m: e.target.value })
                        }
                      />
                    </td>
                    <td className="col-num">
                      <span className="muted">{area || '—'}</span>
                    </td>
                    <td className="col-acoes">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={disabled}
                        onClick={() => onChange(composicao.filter((_, i) => i !== fIdx))}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
