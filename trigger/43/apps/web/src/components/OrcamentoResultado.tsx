import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { OrcamentoFaixaResult, OrcamentoResult } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { prazoUtilLabel } from '../lib/prazoEntrega';
import type { ModeloComposicaoForm, OrcOverrides } from '../lib/orcamentoForm';
import {
  aplicarDraftParametros,
  buildParametrosAjusteLinhas,
  parseTarifasResolvidas,
  valorOverrideAtual,
  type ParametroAjusteId,
} from '../lib/orcamentoParametrosAjuste';
import {
  formatValorFrete,
  freteMotivoLabel,
  modoComFrete,
  modoEntregaLabel,
  totalPropostaFaixa,
} from '../lib/orcamentoFrete';
import {
  buildGuiaProducaoLinhas,
  GUIA_PRODUCAO_GRUPO_LABEL,
  type OrcGuiaProducaoEspec,
} from '../lib/orcamentoGuiaProducao';
import { useTableSort } from '../lib/useTableSort';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { SortableTh } from './SortableTh';

type AbaResultado = 'comercial' | 'interno' | 'producao';

export type ParametrosAjusteCtx = {
  papel: string;
  acabamento: string;
  maquina: string;
  cores: string;
  tubete: string;
  tipoTroca: string;
  rebobinacaoNome?: string;
  impostoPct: number;
  /** Comissão da faixa ativa (ou fallback). */
  comissaoPct: number;
  /** Comissão por índice de faixa — preferido quando há várias. */
  comissaoPctByFaixa?: number[];
  overrides: OrcOverrides;
};

export type ParametrosAjusteApply = {
  overrides: OrcOverrides;
  imposto_pct: number;
  comissao_pct: number;
  faixaIndex: number;
  /** Comissão por índice quando o usuário ajustou mais de uma faixa de uma vez. */
  comissaoPctByFaixa?: number[];
};

type Props = {
  calculo: OrcamentoResult;
  prazoEntregaDias?: number;
  validadeDias?: number;
  toleranciaQtdPct?: number | string;
  /** Composição nome+% — mesma visão da proposta ao cliente */
  modelosComposicao?: ModeloComposicaoForm[] | null;
  /**
   * Especificação do ORC (form ou input_snapshot) — alimenta a Guia de produção.
   * Sem isto a aba mostra aviso; não atrapalha as outras abas.
   */
  guiaEspec?: OrcGuiaProducaoEspec | null;
  /**
   * true (padrão): prévia CONSOLIDADO após Calcular (modelos, prazo).
   * false: o detalhe já mostrou spec/condições — só números do motor
   * (estudo 32 · GERACAO §1.5: cálculo ≠ eco da ficha).
   * Silhueta da faca fica no formulário e na ficha operacional — não na aba comercial.
   */
  echoEspecificacao?: boolean;
  /** Prestação de serviço: sem breakdown de papel/faca e sem guia de produção. */
  modoServico?: boolean;
  /**
   * Contexto para ajustar parâmetros “ao seu entendimento” (só formulário editável).
   * Sem isto o painel é somente leitura (detalhe / snapshot).
   */
  parametrosAjuste?: ParametrosAjusteCtx | null;
  onAplicarParametros?: (a: ParametrosAjusteApply) => void | Promise<void>;
  aplicandoParametros?: boolean;
};

function formatParamValue(v: number | null, unidade: string): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const n = v.toLocaleString('pt-BR', {
    minimumFractionDigits: unidade === '%' || unidade === 'min' || unidade === 'h' ? 0 : 2,
    maximumFractionDigits: 6,
  });
  return `${n} ${unidade}`;
}

function ParametrosCalculoPanel({
  faixas,
  snapshot,
  motorVersion,
  calculo,
  parametrosAjuste,
  onAplicarParametros,
  aplicandoParametros,
}: {
  faixas: OrcamentoFaixaResult[];
  snapshot?: Record<string, unknown>;
  motorVersion: number;
  calculo: OrcamentoResult;
  parametrosAjuste?: ParametrosAjusteCtx | null;
  onAplicarParametros?: (a: ParametrosAjusteApply) => void | Promise<void>;
  aplicandoParametros?: boolean;
}) {
  const [globalDraft, setGlobalDraft] = useState<Partial<Record<ParametroAjusteId, string>>>({});
  const [comissaoDraftByFaixa, setComissaoDraftByFaixa] = useState<Record<number, string>>({});
  const editavel = Boolean(parametrosAjuste && onAplicarParametros);

  const tarifas = useMemo(() => parseTarifasResolvidas(snapshot), [snapshot]);
  const impostoPct =
    parametrosAjuste?.impostoPct ??
    (typeof snapshot?.imposto_pct === 'number'
      ? snapshot.imposto_pct
      : Number(snapshot?.imposto_pct) || 16);

  useEffect(() => {
    setGlobalDraft({});
    setComissaoDraftByFaixa({});
  }, [snapshot, parametrosAjuste?.overrides, faixas]);

  const draftDirty =
    Object.keys(globalDraft).length > 0 || Object.keys(comissaoDraftByFaixa).length > 0;

  const setDraftField = (faixaIndex: number, id: ParametroAjusteId, value: string) => {
    if (id === 'comissao') {
      setComissaoDraftByFaixa((prev) => ({ ...prev, [faixaIndex]: value }));
      return;
    }
    setGlobalDraft((prev) => ({ ...prev, [id]: value }));
  };

  const handleAplicar = () => {
    if (!parametrosAjuste || !onAplicarParametros || faixas.length === 0) return;

    const firstFaixa = faixas[0];
    const tintaUsaAcima =
      tarifas.tinta_faixa_m2 != null
        ? Number(firstFaixa.m2) > Number(tarifas.tinta_faixa_m2)
        : true;

    const mergedDraft: Partial<Record<ParametroAjusteId, string>> = { ...globalDraft };
    const comissaoPctByFaixa = faixas.map((_, i) => {
      const raw = comissaoDraftByFaixa[i];
      if (raw !== undefined && raw.trim() !== '') {
        const n = Number(raw.replace(',', '.'));
        if (Number.isFinite(n) && n >= 0) return n;
      }
      return parametrosAjuste.comissaoPctByFaixa?.[i] ?? parametrosAjuste.comissaoPct;
    });

    let applyFaixaIndex = 0;
    for (let i = 0; i < faixas.length; i += 1) {
      if (i in comissaoDraftByFaixa) {
        mergedDraft.comissao = comissaoDraftByFaixa[i];
        applyFaixaIndex = i;
        break;
      }
    }

    const applied = aplicarDraftParametros({
      draft: mergedDraft,
      overridesBase: parametrosAjuste.overrides,
      ctx: {
        papel: parametrosAjuste.papel,
        acabamento: parametrosAjuste.acabamento,
        maquina: parametrosAjuste.maquina,
        cores: parametrosAjuste.cores,
        tubete: parametrosAjuste.tubete,
        tipoTroca: parametrosAjuste.tipoTroca,
        rebobinacaoNome: parametrosAjuste.rebobinacaoNome ?? tarifas.rebobinacao ?? 'REBOBINAÇÃO',
        comissaoPct: comissaoPctByFaixa[applyFaixaIndex] ?? parametrosAjuste.comissaoPct,
        impostoPct: parametrosAjuste.impostoPct,
        tintaUsaAcima,
      },
    });

    void onAplicarParametros({
      ...applied,
      faixaIndex: applyFaixaIndex,
      comissaoPctByFaixa,
    });
  };

  const facaNova = Boolean(calculo.faca_nova);
  const mostrarFrete = Boolean(calculo.frete);

  const faixasComLinhas = useMemo(
    () =>
      faixas.map((detalhe, faixaIndex) => {
        const comissaoPct =
          parametrosAjuste?.comissaoPctByFaixa?.[faixaIndex] ??
          parametrosAjuste?.comissaoPct ??
          0;
        return {
          detalhe,
          faixaIndex,
          quantidadeLabel: Number(detalhe.quantidade).toLocaleString('pt-BR'),
          comissaoPct,
          linhas: buildParametrosAjusteLinhas({
            tarifas,
            detalhe,
            comissaoPct,
            impostoPct,
          }),
        };
      }),
    [faixas, tarifas, impostoPct, parametrosAjuste?.comissaoPct, parametrosAjuste?.comissaoPctByFaixa],
  );

  const componenteRows = useMemo(() => {
    if (faixasComLinhas.length === 0) return [];
    return faixasComLinhas[0].linhas.map((base) => ({
      id: base.id,
      label: base.label,
      parametro: base.parametro,
      unidade: base.unidade,
      draftKey: base.draftKey,
      celulas: faixasComLinhas.map((fx) => ({
        faixaIndex: fx.faixaIndex,
        quantidadeLabel: fx.quantidadeLabel,
        detalhe: fx.detalhe,
        comissaoPct: fx.comissaoPct,
        linha: fx.linhas.find((ln) => ln.id === base.id)!,
      })),
    }));
  }, [faixasComLinhas]);

  const faixaBandClass = (faixaIndex: number) =>
    faixaIndex % 2 === 1 ? 'orc-params-faixa-band' : '';

  const colsPorFaixa = editavel ? 3 : 2;
  const faixaBorderClass = (faixaIndex: number) =>
    faixaIndex > 0 ? 'orc-params-faixa-border' : '';

  const comparativoStyle = {
    '--orc-faixas': faixas.length,
  } as CSSProperties;

  const faixaGridSpan = (faixaIndex: number) => ({
    gridColumn: `${2 + faixaIndex * colsPorFaixa} / span ${colsPorFaixa}`,
  });

  const renderAjusteInput = (cell: (typeof componenteRows)[number]['celulas'][number]) => {
    if (!parametrosAjuste) return null;
    const ln = cell.linha;
    const tintaUsaAcima =
      tarifas.tinta_faixa_m2 != null
        ? Number(cell.detalhe.m2) > Number(tarifas.tinta_faixa_m2)
        : true;
    const existente = valorOverrideAtual(ln.id, parametrosAjuste.overrides, {
      papel: parametrosAjuste.papel,
      acabamento: parametrosAjuste.acabamento,
      maquina: parametrosAjuste.maquina,
      cores: parametrosAjuste.cores,
      tubete: parametrosAjuste.tubete,
      tipoTroca: parametrosAjuste.tipoTroca,
      rebobinacaoNome: parametrosAjuste.rebobinacaoNome ?? tarifas.rebobinacao ?? 'REBOBINAÇÃO',
      comissaoPct: cell.comissaoPct,
      impostoPct,
      tintaUsaAcima,
    });
    const draftVal =
      ln.id === 'comissao' ? comissaoDraftByFaixa[cell.faixaIndex] : globalDraft[ln.draftKey];
    const showDraft =
      draftVal !== undefined ? draftVal : existente != null ? String(existente) : '';
    return (
      <div className="orc-params-input-wrap">
        <input
          type="text"
          inputMode="decimal"
          className="orc-params-input"
          aria-label={`Ajuste ${ln.label} · ${cell.quantidadeLabel} un. (${ln.unidade})`}
          placeholder={
            ln.valorUsado != null
              ? ln.valorUsado.toLocaleString('pt-BR', { maximumFractionDigits: 6 })
              : 'default'
          }
          value={showDraft}
          onChange={(e) => setDraftField(cell.faixaIndex, ln.draftKey, e.target.value)}
        />
        <span className="orc-params-unidade" title={ln.unidade}>
          {ln.unidade}
        </span>
      </div>
    );
  };

  return (
    <div className="orc-parametros-calculo">
      <p className="orc-result-meta" style={{ margin: '0 0 0.85rem' }}>
        Rastreio interno · motor v{motorVersion} · parâmetros do snapshot deste ORC (não da tarifa
        atual do catálogo).{' '}
        <Link to="/orcamentos/como-calcula">Ver regras →</Link>
      </p>

      <h3 className="orc-fluxo-subtitulo">Parâmetros utilizados no cálculo</h3>
      <p className="orc-result-meta" style={{ margin: '0 0 0.75rem' }}>
        {editavel
          ? 'Valor usado = default do catálogo (ou ajuste já gravado neste ORC). Em Ajustar, digite em qualquer faixa — parâmetros de custo alteram o ORC inteiro; comissão e imposto estim. alteram a faixa correspondente. Vazio volta ao default.'
          : 'Fotografia das tarifas efetivas neste orçamento (somente leitura).'}
      </p>

      <div
        className={`orc-params-comparativo ${editavel ? '' : 'orc-params-comparativo--leitura'}`}
        style={comparativoStyle}
        role="table"
        aria-label="Parâmetros utilizados no cálculo por faixa"
      >
        <div className="orc-params-comparativo-scroll">
          <div className="orc-params-grid orc-params-grid--faixa-labels" role="row">
            <div className="orc-params-cell orc-params-cell-comp orc-params-sticky" role="columnheader" />
            {faixasComLinhas.map((fx) => (
              <div
                key={fx.faixaIndex}
                className={`orc-params-cell orc-params-faixa-label ${faixaBorderClass(fx.faixaIndex)} ${faixaBandClass(fx.faixaIndex)}`}
                style={faixaGridSpan(fx.faixaIndex)}
                role="columnheader"
              >
                {fx.quantidadeLabel} un.
              </div>
            ))}
          </div>

          <div className="orc-params-grid orc-params-grid--head" role="row">
            <div
              className="orc-params-cell orc-params-cell-comp orc-params-sticky orc-params-head-comp"
              role="columnheader"
            >
              Componente
            </div>
            {faixasComLinhas.map((fx) => (
              <Fragment key={fx.faixaIndex}>
                <div
                  className={`orc-params-cell orc-params-head-sub ${faixaBorderClass(fx.faixaIndex)} ${faixaBandClass(fx.faixaIndex)}`}
                  role="columnheader"
                >
                  Valor usado
                </div>
                <div
                  className={`orc-params-cell orc-params-head-sub ${faixaBandClass(fx.faixaIndex)}`}
                  role="columnheader"
                >
                  Resultado
                </div>
                {editavel ? (
                  <div
                    className={`orc-params-cell orc-params-head-sub ${faixaBandClass(fx.faixaIndex)}`}
                    role="columnheader"
                  >
                    Ajustar
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>

          {componenteRows.map((row) => (
            <div key={row.id} className="orc-params-grid orc-params-grid--body" role="row">
              <div
                className="orc-params-cell orc-params-cell-comp orc-params-sticky"
                role="rowheader"
              >
                <strong>{row.label}</strong>
                <div className="field-note">{row.parametro}</div>
              </div>
              {row.celulas.map((cell) => (
                <Fragment key={cell.faixaIndex}>
                  <div
                    className={`orc-params-cell orc-params-valor num ${faixaBorderClass(cell.faixaIndex)} ${faixaBandClass(cell.faixaIndex)}`}
                    role="cell"
                  >
                    {formatParamValue(cell.linha.valorUsado, cell.linha.unidade)}
                  </div>
                  <div
                    className={`orc-params-cell orc-params-resultado num ${faixaBandClass(cell.faixaIndex)}`}
                    role="cell"
                  >
                    {cell.linha.resultadoRs != null
                      ? formatCurrency(cell.linha.resultadoRs)
                      : '—'}
                  </div>
                  {editavel ? (
                    <div
                      className={`orc-params-cell orc-params-ajuste-cell ${faixaBandClass(cell.faixaIndex)}`}
                      role="cell"
                    >
                      {renderAjusteInput(cell)}
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          ))}

          <h3 className="orc-fluxo-subtitulo orc-params-totais-titulo">Totais</h3>

          <div className="orc-params-totais-divider" aria-hidden="true" />

          <div className="orc-params-grid orc-params-grid--totais orc-params-grid--totais-head" role="row">
            <div className="orc-params-cell orc-params-cell-comp orc-params-sticky" role="columnheader" />
            {faixasComLinhas.map((fx) => (
              <div
                key={fx.faixaIndex}
                className={`orc-params-cell orc-params-faixa-label ${faixaBorderClass(fx.faixaIndex)} ${faixaBandClass(fx.faixaIndex)}`}
                style={faixaGridSpan(fx.faixaIndex)}
                role="columnheader"
              >
                {fx.quantidadeLabel} un.
              </div>
            ))}
          </div>

          {(
            [
              { label: 'Serviço arredondado', valor: (fx: OrcamentoFaixaResult) => formatCurrency(fx.valor_etiqueta) },
              { label: 'Matriz', valor: (fx: OrcamentoFaixaResult) => formatCurrency(fx.valor_matriz) },
              ...(facaNova
                ? [
                    {
                      label: 'Faca nova',
                      valor: (fx: OrcamentoFaixaResult) =>
                        formatCurrency(fx.valor_faca_nova ?? calculo.valor_faca_nova ?? 0),
                    },
                  ]
                : []),
              ...(mostrarFrete
                ? [
                    {
                      label: 'Frete',
                      valor: (fx: OrcamentoFaixaResult) =>
                        formatValorFrete(fx.valor_frete, {
                          aDefinir: modoComFrete(calculo.frete?.modo),
                        }),
                    },
                  ]
                : []),
              {
                label: 'Total da proposta',
                destaque: true,
                valor: (fx: OrcamentoFaixaResult) =>
                  formatCurrency(totalPropostaFaixa(fx, facaNova, calculo.valor_faca_nova)),
              },
            ] as const
          ).map((linha) => (
            <div
              key={linha.label}
              className={`orc-params-grid orc-params-grid--totais ${'destaque' in linha && linha.destaque ? 'orc-params-grid--totais-destaque' : ''}`}
              role="row"
            >
              <div
                className="orc-params-cell orc-params-cell-comp orc-params-sticky"
                role="rowheader"
              >
                {linha.label}
              </div>
              {faixas.map((fx, i) => (
                <div
                  key={i}
                  className={`orc-params-cell orc-params-total-valor num ${faixaBorderClass(i)} ${faixaBandClass(i)}`}
                  style={faixaGridSpan(i)}
                  role="cell"
                >
                  {'destaque' in linha && linha.destaque ? (
                    <strong>{linha.valor(fx)}</strong>
                  ) : (
                    linha.valor(fx)
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {mostrarFrete && modoComFrete(calculo.frete?.modo) ? (
        <p className="orc-result-meta" style={{ margin: '0.55rem 0 0' }}>
          {freteMotivoLabel(calculo.frete?.motivo) ??
            'Frete informativo — não entra no total nem no unitário.'}
        </p>
      ) : null}

      {editavel ? (
        <div className="btn-row" style={{ marginTop: '0.85rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={aplicandoParametros || !draftDirty}
            onClick={handleAplicar}
          >
            {aplicandoParametros ? 'Recalculando…' : 'Aplicar e recalcular'}
          </button>
          {draftDirty ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={aplicandoParametros}
              onClick={() => {
                setGlobalDraft({});
                setComissaoDraftByFaixa({});
              }}
            >
              Descartar rascunho
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ComercialFaixasTable({
  faixas,
  facaNova,
  valorFacaNova,
  mostrarFrete,
  freteADefinir,
  modoServico,
  etiqPorRolo,
}: {
  faixas: OrcamentoFaixaResult[];
  facaNova: boolean;
  valorFacaNova?: number;
  mostrarFrete: boolean;
  freteADefinir?: boolean;
  modoServico?: boolean;
  /** Embalagem comercial (input) — constante em todas as faixas. */
  etiqPorRolo?: number | null;
}) {
  const etiqRolo = Number(etiqPorRolo);
  const etiqRoloOk = Number.isFinite(etiqRolo) && etiqRolo > 0;

  const sortGetters = useMemo(
    () => ({
      quantidade: (fx: OrcamentoFaixaResult) => Number(fx.quantidade) || 0,
      etiqueta: (fx: OrcamentoFaixaResult) => Number(fx.valor_etiqueta) || 0,
      etiq_por_rolo: () => (etiqRoloOk ? etiqRolo : 0),
      rolos: (fx: OrcamentoFaixaResult) => Number(fx.rolos) || 0,
      etiquetas: (fx: OrcamentoFaixaResult) => Number(fx.quantidade) || 0,
      total_etiquetas: (fx: OrcamentoFaixaResult) => Number(fx.valor_etiqueta) || 0,
      unitario: (fx: OrcamentoFaixaResult) => {
        const q = Number(fx.quantidade) || 1;
        return (Number(fx.valor_etiqueta) || 0) / q;
      },
      valor_rolo: (fx: OrcamentoFaixaResult) => {
        const et = Number(fx.valor_etiqueta) || 0;
        const rolos = Number(fx.rolos) || 0;
        return rolos > 0 ? et / rolos : 0;
      },
      matriz: (fx: OrcamentoFaixaResult) => Number(fx.valor_matriz) || 0,
      total: (fx: OrcamentoFaixaResult) => totalPropostaFaixa(fx, facaNova, valorFacaNova),
    }),
    [facaNova, valorFacaNova, etiqRolo, etiqRoloOk],
  );

  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(faixas, sortGetters);

  if (modoServico) {
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh
                column="quantidade"
                sorts={sorts}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="num"
              >
                Qtd.
              </SortableTh>
              <SortableTh
                column="etiqueta"
                sorts={sorts}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="num"
              >
                Serviço
              </SortableTh>
              <SortableTh
                column="unitario"
                sorts={sorts}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="num"
              >
                Unitário
              </SortableTh>
              {mostrarFrete ? <th className="num">Frete</th> : null}
              <SortableTh
                column="total"
                sorts={sorts}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={requestSort}
                className="num"
                label="Total da proposta"
              >
                Total
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {sorted.map((fx, i) => {
              const q = Number(fx.quantidade) || 1;
              const et = Number(fx.valor_etiqueta) || 0;
              const total = totalPropostaFaixa(fx, facaNova, valorFacaNova);
              return (
                <tr key={i}>
                  <td className="num">{q.toLocaleString('pt-BR')}</td>
                  <td className="num">{formatCurrency(et)}</td>
                  <td className="num">{formatCurrency(et / q)}</td>
                  {mostrarFrete ? (
                    <td className="num">
                      {formatValorFrete(fx.valor_frete, { aDefinir: freteADefinir })}
                    </td>
                  ) : null}
                  <td className="num">
                    <strong>{formatCurrency(total)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh
              column="etiq_por_rolo"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
            >
              Etiq. por rolo
            </SortableTh>
            <SortableTh
              column="rolos"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
            >
              Rolos
            </SortableTh>
            <SortableTh
              column="etiquetas"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
            >
              Etiquetas
            </SortableTh>
            <SortableTh
              column="total_etiquetas"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
              label="Total das etiquetas"
            >
              Total
            </SortableTh>
            <SortableTh
              column="unitario"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
            >
              Unitário
            </SortableTh>
            <SortableTh
              column="valor_rolo"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
            >
              Valor rolo
            </SortableTh>
            <SortableTh
              column="matriz"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
              label="Matriz / clichê"
            >
              Matriz
            </SortableTh>
            {mostrarFrete ? <th className="num">Frete</th> : null}
            <SortableTh
              column="total"
              sorts={sorts}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={requestSort}
              className="num"
              label="Total da proposta"
            >
              Total
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((fx, i) => {
            const q = Number(fx.quantidade) || 1;
            const et = Number(fx.valor_etiqueta) || 0;
            const rolos = Number(fx.rolos) || 0;
            const valorRolo = rolos > 0 ? et / rolos : null;
            const etiqFaixa = etiqRoloOk
              ? etiqRolo
              : rolos > 0 && q > 0
                ? Math.round(q / rolos)
                : null;
            const total = totalPropostaFaixa(fx, facaNova, valorFacaNova);
            return (
              <tr key={i}>
                <td className="num">
                  {etiqFaixa != null ? etiqFaixa.toLocaleString('pt-BR') : '—'}
                </td>
                <td className="num">
                  {rolos > 0 ? Math.round(rolos).toLocaleString('pt-BR') : '—'}
                </td>
                <td className="num">{q.toLocaleString('pt-BR')}</td>
                <td className="num">{formatCurrency(et)}</td>
                <td className="num">{formatCurrency(et / q)}</td>
                <td className="num">
                  {valorRolo != null ? formatCurrency(valorRolo) : '—'}
                </td>
                <td className="num">{formatCurrency(fx.valor_matriz)}</td>
                {mostrarFrete ? (
                  <td className="num">
                    {formatValorFrete(fx.valor_frete, { aDefinir: freteADefinir })}
                  </td>
                ) : null}
                <td className="num">
                  <strong>{formatCurrency(total)}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GuiaProducaoPanel({
  espec,
  faixa,
  faixas,
  faixaIndex,
  onFaixa,
  modelosComposicao,
}: {
  espec: OrcGuiaProducaoEspec | null | undefined;
  faixa: OrcamentoFaixaResult | undefined;
  faixas: OrcamentoFaixaResult[];
  faixaIndex: number;
  onFaixa: (i: number) => void;
  modelosComposicao?: ModeloComposicaoForm[] | null;
}) {
  const linhas = useMemo(
    () => buildGuiaProducaoLinhas(espec, faixa, modelosComposicao),
    [espec, faixa, modelosComposicao],
  );

  return (
    <>
      <p className="orc-result-meta">
        Lista operacional do que o cálculo prevê para produzir — sem preços.
      </p>
      {faixas.length > 1 ? (
        <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
          {faixas.map((fx, i) => (
            <button
              key={i}
              type="button"
              className={`btn btn-sm ${faixaIndex === i ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onFaixa(i)}
            >
              {Number(fx.quantidade).toLocaleString('pt-BR')} un.
            </button>
          ))}
        </div>
      ) : null}
      {!espec || linhas.length === 0 ? (
        <p className="form-hint" style={{ margin: 0 }}>
          Calcule com a especificação completa para montar a guia desta faixa.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data-table orc-guia-producao-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Item</th>
                <th>Especificação</th>
                <th>Qtde / unidade</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((ln, i) => (
                <tr key={`${ln.grupo}-${ln.item}-${i}`}>
                  <td>
                    <span className="orc-guia-grupo">{GUIA_PRODUCAO_GRUPO_LABEL[ln.grupo]}</span>
                  </td>
                  <td>
                    <strong>{ln.item}</strong>
                  </td>
                  <td>{ln.especificacao}</td>
                  <td className="orc-guia-qtd">{ln.quantidade}</td>
                  <td className="orc-guia-nota">{ln.nota ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function OrcamentoResultado({
  calculo,
  prazoEntregaDias,
  validadeDias,
  toleranciaQtdPct,
  modelosComposicao,
  guiaEspec,
  echoEspecificacao = true,
  modoServico = false,
  parametrosAjuste = null,
  onAplicarParametros,
  aplicandoParametros = false,
}: Props) {
  const servico = modoServico || calculo.tipo_operacao === 'SERVICO';
  const [aba, setAba] = useState<AbaResultado>('comercial');
  const [faixaDetalhe, setFaixaDetalhe] = useState(0);
  const faixas = calculo.faixas ?? [];
  const detalhe = faixas[faixaDetalhe];
  const modelosVisiveis = (modelosComposicao ?? []).filter(
    (m) => String(m.nome ?? '').trim() !== '',
  );

  const abaAtiva: AbaResultado = servico ? 'comercial' : aba;

  return (
    <section className="card orc-resultado">
      <div className="card-body">
        <div className="orc-result-tabs" role="tablist" aria-label="Visões do orçamento">
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'comercial'}
            className={abaAtiva === 'comercial' ? 'active' : ''}
            onClick={() => setAba('comercial')}
          >
            Proposta comercial
          </button>
          {servico ? null : (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={abaAtiva === 'interno'}
                className={abaAtiva === 'interno' ? 'active' : ''}
                onClick={() => setAba('interno')}
              >
                Composição comercial
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={abaAtiva === 'producao'}
                className={abaAtiva === 'producao' ? 'active' : ''}
                onClick={() => setAba('producao')}
              >
                Guia de produção
              </button>
            </>
          )}
        </div>

        {abaAtiva !== 'producao' ? (
          <p className="orc-result-meta">
            {servico ? (
              <>
                Preço comercial informado · arredondamento para cima em múltiplo de R$ 10
                {prazoEntregaDias != null
                  ? ` · ${prazoUtilLabel(
                      calculo.prazo_efetivo_dias ?? prazoEntregaDias,
                      calculo.data_entrega_prevista,
                    )}`
                  : ''}
                {validadeDias != null ? ` · validade ${validadeDias} dias` : ''}
                {toleranciaQtdPct != null ? ` · ±${toleranciaQtdPct}%` : ''}
              </>
            ) : (
              <>
            Matriz:{' '}
            {calculo.cobra_matriz ? formatCurrency(calculo.valor_matriz) : 'Isenta'}
            {(() => {
              const snap = calculo.catalog_snapshot?.matriz_cm2;
              const tarifa =
                typeof snap === 'number'
                  ? snap
                  : typeof snap === 'string' && snap !== ''
                    ? Number(snap)
                    : null;
              return tarifa != null && Number.isFinite(tarifa)
                ? ` · tarifa ${Number(tarifa).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}/cm²`
                : '';
            })()}
            {calculo.faca_nova
              ? ` · Faca nova ${formatCurrency(calculo.valor_faca_nova ?? 0)}${
                  calculo.prazo_faca_dias != null ? ` (+${calculo.prazo_faca_dias}d)` : ''
                }`
              : ''}
            {echoEspecificacao && prazoEntregaDias != null
              ? ` · ${prazoUtilLabel(
                  calculo.prazo_efetivo_dias ?? prazoEntregaDias,
                  calculo.data_entrega_prevista,
                )}`
              : ''}
            {echoEspecificacao && validadeDias != null ? ` · validade ${validadeDias} dias` : ''}
            {echoEspecificacao && toleranciaQtdPct != null ? ` · ±${toleranciaQtdPct}%` : ''}
            {calculo.frete
              ? ` · ${modoEntregaLabel(calculo.frete.modo)}${
                  calculo.frete.destino_label ? ` (${calculo.frete.destino_label})` : ''
                }`
              : ''}
              </>
            )}
          </p>
        ) : null}

        {abaAtiva === 'comercial' ? (
          <>
            {echoEspecificacao && modelosVisiveis.length > 0 ? (
              <ModelosComposicaoTable
                variant="data"
                className="orc-modelos-resultado"
                hint={null}
                modelos={modelosVisiveis}
                faixas={faixas.map((fx, i) => ({
                  key: i,
                  quantidade: Number(fx.quantidade) || 0,
                }))}
              />
            ) : null}
            <ComercialFaixasTable
              faixas={faixas}
              facaNova={Boolean(calculo.faca_nova)}
              valorFacaNova={calculo.valor_faca_nova}
              mostrarFrete={Boolean(calculo.frete)}
              freteADefinir={modoComFrete(calculo.frete?.modo)}
              modoServico={servico}
              etiqPorRolo={
                guiaEspec?.etiq_por_rolo != null && guiaEspec.etiq_por_rolo !== ''
                  ? Number(guiaEspec.etiq_por_rolo)
                  : null
              }
            />
            {calculo.frete ? (
              <p className="orc-result-meta" style={{ marginTop: '0.65rem' }}>
                {[
                  modoEntregaLabel(calculo.frete.modo),
                  calculo.frete.destino_label || null,
                  freteMotivoLabel(calculo.frete.motivo),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {' '}
                · informativo, fora do total e do unitário
              </p>
            ) : null}
          </>
        ) : null}

        {abaAtiva === 'interno' ? (
          <ParametrosCalculoPanel
            faixas={faixas}
            calculo={calculo}
            snapshot={calculo.catalog_snapshot}
            parametrosAjuste={parametrosAjuste}
            onAplicarParametros={onAplicarParametros}
            aplicandoParametros={aplicandoParametros}
            motorVersion={
              typeof calculo.motor_version === 'number'
                ? calculo.motor_version
                : typeof calculo.catalog_snapshot?.motor_version === 'number'
                  ? (calculo.catalog_snapshot.motor_version as number)
                  : 1
            }
          />
        ) : null}

        {abaAtiva === 'producao' ? (
          <GuiaProducaoPanel
            espec={guiaEspec}
            faixa={detalhe}
            faixas={faixas}
            faixaIndex={faixaDetalhe}
            onFaixa={setFaixaDetalhe}
            modelosComposicao={modelosVisiveis}
          />
        ) : null}
      </div>
    </section>
  );
}
