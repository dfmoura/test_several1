import { areaM2FromFaixaOc, formatQty } from '../lib/format';
import {
  emptyOcFaixa,
  qtdeComercialFromFaixas,
  type OcComposicaoVolumesCtx,
  type OcFaixaForm,
} from '../lib/ocComposicaoVolumes';

type Props = {
  composicao: OcFaixaForm[];
  disabled?: boolean;
  onChange: (next: OcFaixaForm[]) => void;
  /** Se true, tipografia/padding reduzidos (A repor). */
  compact?: boolean;
  /**
   * Un. comercial / fator do SKU — ponte Σ m² → qtde da linha.
   * Faixas permanecem físicas (L × volumes × m); a unidade de compra aparece no rodapé.
   */
  comercial?: Pick<
    OcComposicaoVolumesCtx,
    'unidade_comercial' | 'unidade_interna' | 'fator_conversao'
  >;
};

function normUnidadeLabel(raw: string | null | undefined): string {
  const u = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace('M²', 'M2');
  if (!u) return '';
  if (u === 'M2') return 'm²';
  return u;
}

/**
 * Detalhe do pedido — faixas físicas do substrato/Exact (L × volumes × metragem → m²).
 * Só renderizar quando `ocPedidoDetalheUi` permitir.
 * Não escreve estoque; só monta composição em `ordem_compra_item_composicoes`.
 * Qtde comercial da linha = Σ m² (ou ÷ fator quando o SKU compra em KG etc.).
 */
export function OcPedidoComposicaoPanel({
  composicao,
  disabled = false,
  onChange,
  compact = false,
  comercial,
}: Props) {
  const temComposicao = composicao.length > 0;

  let somaArea = 0;
  for (const f of composicao) {
    const area = areaM2FromFaixaOc(f.largura_mm, f.quantidade, f.comprimento_m);
    if (area) somaArea += Number(area);
  }
  const qtdeComercial =
    temComposicao && somaArea > 0
      ? qtdeComercialFromFaixas(composicao, comercial ?? {})
      : '';
  const unLabel = normUnidadeLabel(comercial?.unidade_comercial);
  const mostraPonte = Boolean(qtdeComercial && unLabel);

  const patchFaixa = (faixaIdx: number, patch: Partial<OcFaixaForm>) => {
    const next = composicao.map((f, i) => (i === faixaIdx ? { ...f, ...patch } : f));
    onChange(next);
  };

  return (
    <div className={`oc-volumes-panel${compact ? ' oc-volumes-panel--compact' : ''}`}>
      <div className="oc-volumes-panel__bar">
        <strong>
          Detalhe do pedido (faixas físicas)
          {temComposicao ? ` · ${composicao.length}` : ''}
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
        <>
          <div className="oc-volumes-scroll">
            <table className="oc-volumes-table">
              <thead>
                <tr>
                  <th className="col-idx">#</th>
                  <th className="col-num">Largura mm</th>
                  <th
                    className="col-num"
                    title="Quantidade de volumes físicos (bobinas)"
                  >
                    Qtd volumes
                  </th>
                  <th className="col-num">Comp. m</th>
                  <th className="col-num" title="Área física da faixa">
                    Área m²
                  </th>
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
                          onChange={(e) =>
                            patchFaixa(fIdx, { largura_mm: e.target.value })
                          }
                        />
                      </td>
                      <td className="col-num">
                        <input
                          inputMode="decimal"
                          required
                          disabled={disabled}
                          placeholder="9"
                          value={faixa.quantidade}
                          onChange={(e) =>
                            patchFaixa(fIdx, { quantidade: e.target.value })
                          }
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
                          onClick={() =>
                            onChange(composicao.filter((_, i) => i !== fIdx))
                          }
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
          {mostraPonte ? (
            <p className="oc-volumes-panel__bridge" role="status">
              Σ área {formatQty(somaArea)} m² → pedido{' '}
              <strong>
                {formatQty(qtdeComercial)} {unLabel}
              </strong>
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted oc-volumes-panel__hint">
          Opcional · faixas físicas ao fornecedor (L × volumes × m). A qtde comercial da
          linha (m², kg, …) deriva da Σ área. Sem faixas, informe a qtde na linha.
        </p>
      )}
    </div>
  );
}
