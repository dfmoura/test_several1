import { useMemo } from 'react';
import {
  matrizQuantidadesModelos,
  somaValorArteModelos,
  type FaixaForm,
  type ModeloComposicaoForm,
} from '../lib/orcamentoForm';
import { modeloArteCaptionFromMedida, ModeloArteTrigger } from './ModeloArteOverlay';
import { ModeloTintasInput } from './ModeloTintasInput';
import { NumericInput } from './NumericInput';

type Props = {
  modelos: ModeloComposicaoForm[];
  faixas: FaixaForm[];
  quantidades: number[][];
  canWrite: boolean;
  onNomeChange: (index: number, nome: string) => void;
  onValorArteChange: (index: number, valorArte: number) => void;
  onArteUrlChange: (index: number, arteUrl: string | null) => void;
  onTintasChange: (index: number, tintas: string[]) => void;
  onQuantidadeChange: (faixaIdx: number, modeloIdx: number, qtd: number) => void;
  /** Equal-split em cada faixa (colunas independentes). */
  onEqualizar?: () => void;
  /** Eco no overlay da arte (item atual). */
  medida?: string | null;
  saidaEtiqueta?: string | null;
};

function formatQtd(value: number): string {
  return Math.max(0, Math.floor(value) || 0).toLocaleString('pt-BR');
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type FaixaCol = {
  idx: number;
  quantidade: number;
  qs: number[];
  ok: boolean;
};

/**
 * Editor da composição operacional: nome + arte visual + valor + quantidade por faixa.
 * Cada coluna (faixa) é independente; o último modelo recebe o restante da própria faixa.
 */
export function ModelosComposicaoEditor({
  modelos,
  faixas,
  quantidades,
  canWrite,
  onNomeChange,
  onValorArteChange,
  onArteUrlChange,
  onTintasChange,
  onQuantidadeChange,
  onEqualizar,
  medida,
  saidaEtiqueta,
}: Props) {
  const matriz = useMemo(
    () => matrizQuantidadesModelos(faixas, modelos, quantidades),
    [faixas, modelos, quantidades],
  );

  const faixasOk: FaixaCol[] = useMemo(
    () =>
      faixas
        .map((f, idx) => ({ ...f, idx }))
        .filter((f) => f.quantidade > 0)
        .map((fx) => {
          const target = Math.floor(fx.quantidade) || 0;
          const qs = matriz[fx.idx] ?? [];
          const soma = qs.reduce((s, q) => s + q, 0);
          const ok = soma === target && qs.every((q) => q > 0);
          return { idx: fx.idx, quantidade: fx.quantidade, qs, ok };
        }),
    [faixas, matriz],
  );

  const singleModel = modelos.length === 1;
  const somaArtes = somaValorArteModelos(modelos);
  const allOk = faixasOk.length === 0 || faixasOk.every((fx) => fx.ok);

  return (
    <div className="orc-modelos-composicao-editor">
      {canWrite && faixasOk.length > 0 && !singleModel && onEqualizar ? (
        <div className="orc-modelos-editor-toolbar" role="toolbar" aria-label="Composição dos modelos">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onEqualizar}
            title="Divide cada faixa em partes iguais entre as artes"
          >
            Igualar artes
          </button>
        </div>
      ) : null}

      {faixasOk.length > 0 && !singleModel ? (
        <p
          className={`orc-modelos-fechamento${allOk ? ' is-ok' : ' is-invalid'}`}
          role="status"
        >
          {allOk
            ? faixasOk.length === 1
              ? `Fechado · ${formatQtd(faixasOk[0].qs.reduce((s, q) => s + q, 0))} / ${formatQtd(faixasOk[0].quantidade)} · último modelo com resto`
              : 'Todas as faixas fechadas · cada coluna é independente'
            : 'Ajuste as quantidades nas faixas em aberto (cada coluna fecha sozinha)'}
        </p>
      ) : null}

      <div className="table-wrap orc-modelos-editor-wrap">
        <table className="data-table orc-modelos-editor-table">
          <thead>
            <tr>
              <th className="orc-modelo-ord-col">#</th>
              <th className="orc-modelo-fig-col" title="Arte visual do modelo (opcional)">
                Fig.
              </th>
              <th className="orc-modelo-nome-col">Modelo (arte)</th>
              <th
                className="orc-modelo-tintas-col"
                title="Cores nomeadas desta arte — não altera o preço nem as estações"
              >
                Cores da arte
              </th>
              <th
                className="orc-modelo-arte-col"
                title="Valor cotado desta arte — entra no total do orçamento"
              >
                Vlr. Arte
              </th>
              {faixasOk.length === 0 ? (
                <th className="orc-modelo-qtd-col">Quantidade</th>
              ) : (
                faixasOk.map((fx) => (
                  <th
                    key={fx.idx}
                    className={`orc-modelo-qtd-col${fx.ok ? '' : ' is-open'}`}
                    title="Quantidade desta faixa — independente das demais colunas"
                  >
                    {faixasOk.length === 1
                      ? 'Quantidade'
                      : `${formatQtd(fx.quantidade)} un.`}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {modelos.map((m, mi) => {
              const isLast = mi === modelos.length - 1;
              const isRestoRow = !singleModel && isLast;
              return (
                <tr key={m.ordem} className={isRestoRow ? 'orc-modelo-resto-row' : undefined}>
                  <td className="orc-modelo-ord-col">{m.ordem || mi + 1}</td>
                  <td className="orc-modelo-fig-col">
                    <ModeloArteTrigger
                      nome={m.nome || `Modelo ${mi + 1}`}
                      arteUrl={m.arte_url}
                      editable={canWrite}
                      onChange={(next) => onArteUrlChange(mi, next.arte_url)}
                      dense
                      caption={modeloArteCaptionFromMedida(medida)}
                      saidaEtiqueta={saidaEtiqueta}
                    />
                  </td>
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
                    {isRestoRow ? (
                      <span className="orc-modelo-resto-hint">Recebe o restante desta faixa</span>
                    ) : null}
                  </td>
                  <td className="orc-modelo-tintas-col">
                    <ModeloTintasInput
                      value={m.tintas}
                      onChange={(next) => onTintasChange(mi, next)}
                      disabled={!canWrite}
                      aria-label={`Cores da arte do modelo ${mi + 1}`}
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
                  {faixasOk.length === 0 ? (
                    <td className="orc-modelo-qtd-col">
                      <span className="orc-modelo-qtd-placeholder">—</span>
                    </td>
                  ) : (
                    faixasOk.map((fx) => {
                      const qtd = fx.qs[mi] ?? 0;
                      const invalid = qtd <= 0;
                      const editable = canWrite && !singleModel && !isRestoRow;

                      if (singleModel || isRestoRow) {
                        return (
                          <td
                            key={fx.idx}
                            className={`orc-modelo-qtd-col${invalid ? ' is-invalid' : ''}`}
                          >
                            <span
                              className={`orc-modelo-qtd-readonly${invalid ? ' is-invalid' : ''}${isRestoRow ? ' is-resto' : ''}`}
                              title="Calculado automaticamente para fechar o total desta faixa"
                            >
                              {formatQtd(qtd)}
                            </span>
                          </td>
                        );
                      }

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
                            disabled={!editable}
                            aria-label={`Quantidade do modelo ${mi + 1} na faixa ${formatQtd(fx.quantidade)}`}
                          />
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="orc-modelos-editor-total">
              <td colSpan={4}>
                {faixasOk.length > 0 ? 'Totais' : 'Total artes'}
              </td>
              <td className="orc-modelo-arte-col orc-modelos-total-cell">
                <span className="orc-modelos-total-val">{formatMoney(somaArtes)}</span>
              </td>
              {faixasOk.length === 0 ? (
                <td className="orc-modelo-qtd-col">—</td>
              ) : (
                faixasOk.map((fx) => {
                  const soma = fx.qs.reduce((s, q) => s + q, 0);
                  const target = Math.floor(fx.quantidade) || 0;
                  const resto = fx.qs.length > 1 ? fx.qs[fx.qs.length - 1] : 0;
                  return (
                    <td
                      key={fx.idx}
                      className={`orc-modelo-qtd-col orc-modelos-total-cell${fx.ok ? ' is-ok' : ' is-invalid'}`}
                    >
                      <span className="orc-modelos-total-val">{formatQtd(soma)}</span>
                      <span className="orc-modelos-total-ref"> / {formatQtd(target)}</span>
                      {!singleModel ? (
                        <span className="orc-modelos-total-resto">
                          resto {formatQtd(resto)}
                        </span>
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
