import { useEffect, useMemo, useState } from 'react';
import {
  alocarQuantidadePorModelo,
  escolherFaixaAncoraIdx,
  somaValorArteModelos,
  type FaixaForm,
  type ModeloComposicaoForm,
} from '../lib/orcamentoForm';
import { ModeloArteTrigger } from './ModeloArteOverlay';
import { NumericInput } from './NumericInput';

type Props = {
  modelos: ModeloComposicaoForm[];
  faixas: FaixaForm[];
  canWrite: boolean;
  onNomeChange: (index: number, nome: string) => void;
  onValorArteChange: (index: number, valorArte: number) => void;
  onArteUrlChange: (index: number, arteUrl: string | null) => void;
  onQuantidadeChange: (faixaIdx: number, modeloIdx: number, qtd: number) => void;
  /** Equal-split canônico (preserva nomes / valor_arte / arte_url). */
  onEqualizar?: () => void;
};

function formatQtd(value: number): string {
  return Math.max(0, Math.floor(value) || 0).toLocaleString('pt-BR');
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type FaixaAloc = {
  idx: number;
  quantidade: number;
  alocados: Array<ModeloComposicaoForm & { quantidade: number }>;
};

/**
 * Editor da composição operacional: nome + arte visual + valor + quantidade.
 * Rateio único (%) — edição em unidades na faixa âncora; demais faixas são prévia.
 * Último modelo recebe o restante automaticamente.
 */
export function ModelosComposicaoEditor({
  modelos,
  faixas,
  canWrite,
  onNomeChange,
  onValorArteChange,
  onArteUrlChange,
  onQuantidadeChange,
  onEqualizar,
}: Props) {
  const faixasOk = useMemo(
    () =>
      faixas
        .map((f, i) => ({ ...f, idx: i }))
        .filter((f) => f.quantidade > 0),
    [faixas],
  );

  const alocPorFaixa: FaixaAloc[] = useMemo(
    () =>
      faixasOk.map((fx) => ({
        idx: fx.idx,
        quantidade: fx.quantidade,
        alocados: alocarQuantidadePorModelo(fx.quantidade, modelos),
      })),
    [faixasOk, modelos],
  );

  const defaultAncora = useMemo(() => escolherFaixaAncoraIdx(faixas), [faixas]);
  const [ancoraIdx, setAncoraIdx] = useState(defaultAncora);

  useEffect(() => {
    if (alocPorFaixa.length === 0) {
      setAncoraIdx(-1);
      return;
    }
    const aindaValida = alocPorFaixa.some((fx) => fx.idx === ancoraIdx);
    if (!aindaValida) {
      setAncoraIdx(defaultAncora);
    }
  }, [alocPorFaixa, ancoraIdx, defaultAncora]);

  const singleModel = modelos.length === 1;
  const somaArtes = somaValorArteModelos(modelos);
  const multiFaixa = alocPorFaixa.length > 1;
  const ancora =
    alocPorFaixa.find((fx) => fx.idx === ancoraIdx) ?? alocPorFaixa[0] ?? null;

  const ancoraStatus = useMemo(() => {
    if (!ancora) return null;
    const target = Math.floor(ancora.quantidade) || 0;
    const soma = ancora.alocados.reduce((s, r) => s + r.quantidade, 0);
    const lastQtd =
      ancora.alocados.length > 0
        ? ancora.alocados[ancora.alocados.length - 1].quantidade
        : 0;
    const allPositive = ancora.alocados.every((r) => r.quantidade > 0);
    const ok = soma === target && allPositive;
    return { target, soma, lastQtd, allPositive, ok };
  }, [ancora]);

  return (
    <div className="orc-modelos-composicao-editor">
      {canWrite && alocPorFaixa.length > 0 && !singleModel ? (
        <div className="orc-modelos-editor-toolbar" role="toolbar" aria-label="Composição dos modelos">
          {multiFaixa ? (
            <div className="orc-modelos-ancora-group">
              <span className="orc-modelos-ancora-label">Editar pela faixa</span>
              <div className="orc-modelos-ancora-btns">
                {alocPorFaixa.map((fx) => {
                  const active = fx.idx === (ancora?.idx ?? -1);
                  return (
                    <button
                      key={fx.idx}
                      type="button"
                      className={`btn btn-sm${active ? ' btn-primary' : ' btn-secondary'}`}
                      aria-pressed={active}
                      onClick={() => setAncoraIdx(fx.idx)}
                    >
                      {formatQtd(fx.quantidade)} un.
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {onEqualizar ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onEqualizar}
              title="Divide o total em partes iguais entre as artes"
            >
              Igualar artes
            </button>
          ) : null}
        </div>
      ) : null}

      {ancoraStatus && !singleModel && alocPorFaixa.length > 0 ? (
        <p
          className={`orc-modelos-fechamento${ancoraStatus.ok ? ' is-ok' : ' is-invalid'}`}
          role="status"
        >
          {ancoraStatus.ok ? (
            <>
              Fechado · {formatQtd(ancoraStatus.soma)} / {formatQtd(ancoraStatus.target)}
              {modelos.length > 1 ? (
                <>
                  {' '}
                  · último modelo com resto ({formatQtd(ancoraStatus.lastQtd)})
                </>
              ) : null}
            </>
          ) : !ancoraStatus.allPositive ? (
            <>
              Ajuste as quantidades · cada arte precisa de quantidade &gt; 0
              {ancoraStatus.lastQtd <= 0
                ? ' (o último modelo ficou sem resto — reduza as demais)'
                : ''}
            </>
          ) : (
            <>
              Soma {formatQtd(ancoraStatus.soma)} / {formatQtd(ancoraStatus.target)}
            </>
          )}
          {multiFaixa ? (
            <span className="orc-modelos-fechamento-note">
              {' '}
              · demais faixas espelham o mesmo rateio
            </span>
          ) : null}
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
                className="orc-modelo-arte-col"
                title="Valor cotado desta arte — entra no total do orçamento"
              >
                Vlr. Arte
              </th>
              {alocPorFaixa.length === 0 ? (
                <th className="orc-modelo-qtd-col">Quantidade</th>
              ) : (
                alocPorFaixa.map((fx) => {
                  const isAncora = fx.idx === (ancora?.idx ?? -1);
                  const title = multiFaixa
                    ? isAncora
                      ? 'Faixa âncora — edite as quantidades nesta coluna'
                      : 'Prévia do mesmo rateio (somente leitura)'
                    : 'Total desta faixa';
                  return (
                    <th
                      key={fx.idx}
                      className={`orc-modelo-qtd-col${isAncora ? ' is-active' : ' is-preview'}`}
                      title={title}
                    >
                      {alocPorFaixa.length === 1
                        ? 'Quantidade'
                        : `${formatQtd(fx.quantidade)} un.`}
                      {multiFaixa && isAncora ? (
                        <span className="orc-modelo-qtd-col-tag"> editar</span>
                      ) : null}
                      {multiFaixa && !isAncora ? (
                        <span className="orc-modelo-qtd-col-tag"> prévia</span>
                      ) : null}
                    </th>
                  );
                })
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
                      <span className="orc-modelo-resto-hint">Recebe o restante</span>
                    ) : null}
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
                      const isAncora = fx.idx === (ancora?.idx ?? -1);
                      const editable =
                        canWrite && !singleModel && isAncora && !isRestoRow;

                      if (!isAncora || singleModel || isRestoRow) {
                        return (
                          <td
                            key={fx.idx}
                            className={`orc-modelo-qtd-col${isAncora ? ' is-active' : ' is-preview'}${invalid ? ' is-invalid' : ''}`}
                          >
                            <span
                              className={`orc-modelo-qtd-readonly${invalid ? ' is-invalid' : ''}${isRestoRow && isAncora ? ' is-resto' : ''}`}
                              title={
                                isRestoRow
                                  ? 'Calculado automaticamente para fechar o total da faixa'
                                  : multiFaixa && !isAncora
                                    ? 'Prévia do rateio definido na faixa âncora'
                                    : undefined
                              }
                            >
                              {formatQtd(qtd)}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={fx.idx} className="orc-modelo-qtd-col is-active">
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
              <td colSpan={3}>
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
                  const isAncora = fx.idx === (ancora?.idx ?? -1);
                  const resto =
                    fx.alocados.length > 1
                      ? fx.alocados[fx.alocados.length - 1].quantidade
                      : 0;
                  return (
                    <td
                      key={fx.idx}
                      className={`orc-modelo-qtd-col orc-modelos-total-cell${isAncora ? ' is-active' : ' is-preview'}${ok ? ' is-ok' : ' is-invalid'}`}
                    >
                      <span className="orc-modelos-total-val">{formatQtd(soma)}</span>
                      <span className="orc-modelos-total-ref"> / {formatQtd(target)}</span>
                      {isAncora && !singleModel ? (
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
