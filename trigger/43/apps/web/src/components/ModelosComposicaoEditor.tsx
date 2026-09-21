import {
  alocarQuantidadePorModelo,
  somaValorArteModelos,
  type FaixaForm,
  type ModeloComposicaoForm,
} from '../lib/orcamentoForm';
import { NumericInput } from './NumericInput';

type Props = {
  modelos: ModeloComposicaoForm[];
  faixas: FaixaForm[];
  canWrite: boolean;
  onNomeChange: (index: number, nome: string) => void;
  onValorArteChange: (index: number, valorArte: number) => void;
  onQuantidadeChange: (faixaIdx: number, modeloIdx: number, qtd: number) => void;
};

function formatQtd(value: number): string {
  return Math.max(0, Math.floor(value) || 0).toLocaleString('pt-BR');
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Editor da composição operacional: nome + valor da arte + quantidade por faixa.
 */
export function ModelosComposicaoEditor({
  modelos,
  faixas,
  canWrite,
  onNomeChange,
  onValorArteChange,
  onQuantidadeChange,
}: Props) {
  const faixasOk = faixas
    .map((f, i) => ({ ...f, idx: i }))
    .filter((f) => f.quantidade > 0);

  const alocPorFaixa = faixasOk.map((fx) => ({
    idx: fx.idx,
    quantidade: fx.quantidade,
    alocados: alocarQuantidadePorModelo(fx.quantidade, modelos),
  }));

  const singleModel = modelos.length === 1;
  const somaArtes = somaValorArteModelos(modelos);

  return (
    <div className="orc-modelos-composicao-editor">
      <div className="table-wrap orc-modelos-editor-wrap">
        <table className="data-table orc-modelos-editor-table">
          <thead>
            <tr>
              <th className="orc-modelo-ord-col">#</th>
              <th className="orc-modelo-nome-col">Modelo (arte)</th>
              <th className="orc-modelo-arte-col" title="Valor cotado desta arte — entra no total do orçamento">
                Vlr. Arte
              </th>
              {alocPorFaixa.length === 0 ? (
                <th className="orc-modelo-qtd-col">Quantidade</th>
              ) : (
                alocPorFaixa.map((fx) => (
                  <th key={fx.idx} className="orc-modelo-qtd-col" title="Total desta faixa">
                    {alocPorFaixa.length === 1
                      ? 'Quantidade'
                      : `${formatQtd(fx.quantidade)} un.`}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {modelos.map((m, mi) => (
              <tr key={m.ordem}>
                <td className="orc-modelo-ord-col">{m.ordem || mi + 1}</td>
                <td className="orc-modelo-nome-col">
                  <input
                    type="text"
                    className="orc-modelo-nome-input"
                    maxLength={120}
                    placeholder="Ex.: bob esponja, maçã verde…"
                    value={m.nome}
                    onChange={(e) => onNomeChange(mi, e.target.value)}
                    disabled={!canWrite}
                    aria-label={`Nome do modelo ${mi + 1}`}
                  />
                </td>
                <td className="orc-modelo-arte-col">
                  <NumericInput
                    className="orc-modelo-arte-input"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    value={m.valor_arte}
                    emptyCommit={0}
                    blankZero
                    onCommit={(v) => onValorArteChange(mi, v === '' ? 0 : Math.max(0, v))}
                    disabled={!canWrite}
                    aria-label={`Vlr. Arte do modelo ${mi + 1}`}
                  />
                </td>
                {alocPorFaixa.length === 0 ? (
                  <td className="orc-modelo-qtd-col">
                    <span className="orc-modelo-qtd-placeholder">—</span>
                  </td>
                ) : (
                  alocPorFaixa.map((fx) => {
                    const qtd = fx.alocados[mi]?.quantidade ?? 0;
                    const invalid = qtd <= 0;
                    return (
                      <td key={fx.idx} className="orc-modelo-qtd-col">
                        <NumericInput
                          className={`orc-modelo-qtd-input${invalid ? ' is-invalid' : ''}`}
                          integer
                          min={0}
                          value={qtd}
                          emptyCommit={0}
                          blankZero
                          onCommit={(v) =>
                            onQuantidadeChange(fx.idx, mi, v === '' ? 0 : v)
                          }
                          disabled={!canWrite || singleModel}
                          aria-label={`Quantidade do modelo ${mi + 1} na faixa ${formatQtd(fx.quantidade)}`}
                        />
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="orc-modelos-editor-total">
              <td colSpan={2}>
                {alocPorFaixa.length > 0 ? 'Totais' : 'Total artes'}
              </td>
              <td className="orc-modelo-arte-col orc-modelos-total-cell">
                <span className="orc-modelos-total-val">{formatMoney(somaArtes)}</span>
              </td>
              {alocPorFaixa.length === 0 ? (
                <td className="orc-modelo-qtd-col">—</td>
              ) : (
                alocPorFaixa.map((fx) => {
                  const soma = fx.alocados.reduce((s, r) => s + r.quantidade, 0);
                  const target = Math.floor(fx.quantidade) || 0;
                  const ok = soma === target && fx.alocados.every((r) => r.quantidade > 0);
                  return (
                    <td
                      key={fx.idx}
                      className={`orc-modelo-qtd-col orc-modelos-total-cell${ok ? ' is-ok' : ' is-invalid'}`}
                    >
                      <span className="orc-modelos-total-val">{formatQtd(soma)}</span>
                      {alocPorFaixa.length > 1 ? (
                        <span className="orc-modelos-total-ref"> / {formatQtd(target)}</span>
                      ) : null}
                    </td>
                  );
                })
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
