import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrcamentoFaixaResult, OrcamentoResult } from '../lib/api';
import { formatCurrency, formatDecimalBr } from '../lib/format';
import type { ModeloComposicaoForm, OrcOverrides } from '../lib/orcamentoForm';
import {
  aplicarDraftParametros,
  buildParametrosAjusteLinhas,
  parseTarifasResolvidas,
  valorOverrideAtual,
  type ParametroAjusteId,
} from '../lib/orcamentoParametrosAjuste';
import {
  explicarFechamentoFrete,
  formatValorFrete,
  freteMotivoLabel,
  modoEntregaLabel,
  ORIGEM_MANUAL,
  origemFreteLabel,
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
import {
  OrcamentoFacaDesenho,
  type OrcamentoFacaDesenhoProps,
} from './OrcamentoFacaDesenho';

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
};

type Props = {
  calculo: OrcamentoResult;
  prazoEntregaDias?: number;
  validadeDias?: number;
  toleranciaQtdPct?: number | string;
  /** Desenho da faca (input_snapshot) — reforço visual na proposta */
  facaDesenho?: OrcamentoFacaDesenhoProps | null;
  /** Composição nome+% — mesma visão da proposta ao cliente */
  modelosComposicao?: ModeloComposicaoForm[] | null;
  /**
   * Especificação do ORC (form ou input_snapshot) — alimenta a Guia de produção.
   * Sem isto a aba mostra aviso; não atrapalha as outras abas.
   */
  guiaEspec?: OrcGuiaProducaoEspec | null;
  /**
   * true (padrão): prévia CONSOLIDADO após Calcular (faca, modelos, prazo).
   * false: o detalhe já mostrou spec/faca/condições — só números do motor
   * (estudo 32 · GERACAO §1.5: cálculo ≠ eco da ficha).
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

function snapNum(snapshot: Record<string, unknown> | undefined, key: string): string | null {
  if (!snapshot) return null;
  const v = snapshot[key];
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
  }
  if (typeof v === 'string' && v !== '' && Number.isFinite(Number(v))) {
    return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 6 });
  }
  return null;
}

function formatParamValue(v: number | null, unidade: string): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const n = v.toLocaleString('pt-BR', {
    minimumFractionDigits: unidade === '%' || unidade === 'min' || unidade === 'h' ? 0 : 2,
    maximumFractionDigits: 6,
  });
  return `${n} ${unidade}`;
}

function FluxoCalculoPanel({
  detalhe,
  snapshot,
  motorVersion,
  faixaIndex,
  parametrosAjuste,
  onAplicarParametros,
  aplicandoParametros,
}: {
  detalhe: OrcamentoFaixaResult;
  snapshot?: Record<string, unknown>;
  motorVersion: number;
  faixaIndex: number;
  parametrosAjuste?: ParametrosAjusteCtx | null;
  onAplicarParametros?: (a: ParametrosAjusteApply) => void | Promise<void>;
  aplicandoParametros?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<ParametroAjusteId, string>>>({});
  const editavel = Boolean(parametrosAjuste && onAplicarParametros);

  const tarifas = useMemo(() => parseTarifasResolvidas(snapshot), [snapshot]);
  const impostoPct =
    parametrosAjuste?.impostoPct ??
    (typeof snapshot?.imposto_pct === 'number'
      ? snapshot.imposto_pct
      : Number(snapshot?.imposto_pct) || 16);
  const comissaoPct = parametrosAjuste?.comissaoPct ?? 0;

  const paramLinhas = useMemo(
    () =>
      buildParametrosAjusteLinhas({
        tarifas,
        detalhe,
        comissaoPct,
        impostoPct,
      }),
    [tarifas, detalhe, comissaoPct, impostoPct],
  );

  useEffect(() => {
    setDraft({});
  }, [faixaIndex, snapshot, parametrosAjuste?.overrides]);

  const linhas = [
    {
      regra: 'R1 · Metragem',
      valor: `${formatDecimalBr(detalhe.metragem, 1)} m`,
      param: null as string | null,
    },
    {
      regra: 'R2 · Área',
      valor: `${formatDecimalBr(detalhe.m2, 2)} m²`,
      param: null,
    },
    {
      regra: 'R3 · Hora-máquina',
      valor: `${formatDecimalBr(detalhe.hora_maq, 3)} h`,
      param: snapNum(snapshot, 'setup_horas')
        ? `setup_horas = ${snapNum(snapshot, 'setup_horas')} h`
        : null,
    },
    {
      regra: 'R4 · Troca bobina',
      valor: `${formatDecimalBr(detalhe.hora_troca_bobina, 3)} h`,
      param: [
        snapNum(snapshot, 'limite_metragem_bobina')
          ? `limite = ${snapNum(snapshot, 'limite_metragem_bobina')} m`
          : null,
        snapNum(snapshot, 'minutos_troca_bobina')
          ? `minutos = ${snapNum(snapshot, 'minutos_troca_bobina')}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
    },
    {
      regra: 'R6 · Perda acerto',
      valor: `${formatDecimalBr(detalhe.perda_acerto, 2)} m²`,
      param: snapNum(snapshot, 'perda_papel_f6')
        ? `F6 = ${snapNum(snapshot, 'perda_papel_f6')}`
        : null,
    },
    {
      regra: 'CUSTO · Papel',
      valor: formatCurrency(detalhe.valor_papel),
      param: tarifas.preco_papel != null
        ? `${formatParamValue(tarifas.preco_papel, 'R$/m²')}${tarifas.papel ? ` · ${tarifas.papel}` : ''}`
        : null,
    },
    {
      regra: 'CUSTO · Tinta',
      valor: formatCurrency(detalhe.valor_tinta),
      param: [
        snapNum(snapshot, 'tinta_faixa_m2')
          ? `faixa = ${snapNum(snapshot, 'tinta_faixa_m2')} m²`
          : null,
        snapNum(snapshot, 'tinta_acima_m2')
          ? `acima = ${snapNum(snapshot, 'tinta_acima_m2')}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
    },
    {
      regra: 'FECHAMENTO · Teto',
      valor: formatCurrency(detalhe.valor_etiqueta),
      param: snapNum(snapshot, 'ceiling_etiqueta')
        ? `ceiling = R$ ${snapNum(snapshot, 'ceiling_etiqueta')}`
        : null,
    },
    {
      regra: 'MATRIZ',
      valor: formatCurrency(detalhe.valor_matriz),
      param: snapNum(snapshot, 'matriz_cm2')
        ? `matriz_cm2 = ${snapNum(snapshot, 'matriz_cm2')} R$/cm²`
        : null,
    },
  ];

  const handleAplicar = () => {
    if (!parametrosAjuste || !onAplicarParametros) return;
    const tintaUsaAcima =
      tarifas.tinta_faixa_m2 != null
        ? Number(detalhe.m2) > Number(tarifas.tinta_faixa_m2)
        : true;
    const applied = aplicarDraftParametros({
      draft,
      overridesBase: parametrosAjuste.overrides,
      ctx: {
        papel: parametrosAjuste.papel,
        acabamento: parametrosAjuste.acabamento,
        maquina: parametrosAjuste.maquina,
        cores: parametrosAjuste.cores,
        tubete: parametrosAjuste.tubete,
        tipoTroca: parametrosAjuste.tipoTroca,
        rebobinacaoNome: parametrosAjuste.rebobinacaoNome ?? tarifas.rebobinacao ?? 'REBOBINAÇÃO',
        comissaoPct: parametrosAjuste.comissaoPct,
        impostoPct: parametrosAjuste.impostoPct,
        tintaUsaAcima,
      },
    });
    void onAplicarParametros({
      ...applied,
      faixaIndex,
    });
  };

  const draftDirty = Object.keys(draft).length > 0;

  return (
    <div className="orc-fluxo-calculo" style={{ marginTop: '1rem' }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? 'Ocultar fluxo do cálculo' : 'Como chegou neste valor'}
      </button>
      {open ? (
        <div className="card" style={{ marginTop: '0.65rem' }}>
          <div className="card-body" style={{ display: 'grid', gap: '0.85rem' }}>
            <p className="orc-result-meta" style={{ margin: 0 }}>
              Rastreio interno · motor v{motorVersion} · parâmetros do snapshot deste ORC
              (não da tarifa atual do catálogo).{' '}
              <Link to="/orcamentos/como-calcula">Ver regras →</Link>
            </p>

            <div>
              <h3 className="orc-fluxo-subtitulo">Parâmetros utilizados no cálculo</h3>
              <p className="orc-result-meta" style={{ margin: '0 0 0.55rem' }}>
                {editavel
                  ? 'Valor usado = default do catálogo (ou ajuste já gravado neste ORC). Preencha “Ao seu entendimento” só onde quiser divergir; vazio volta ao default. Comissão e imposto estim. alteram a faixa / o ORC.'
                  : 'Fotografia das tarifas efetivas neste orçamento (somente leitura).'}
              </p>
              <div className="table-wrap">
                <table className="data-table orc-params-ajuste-table">
                  <thead>
                    <tr>
                      <th>Componente</th>
                      <th>Parâmetro</th>
                      <th>Valor usado</th>
                      <th>Resultado</th>
                      {editavel ? <th>Ao seu entendimento</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {paramLinhas.map((ln) => {
                      const tintaUsaAcima =
                        tarifas.tinta_faixa_m2 != null
                          ? Number(detalhe.m2) > Number(tarifas.tinta_faixa_m2)
                          : true;
                      const existente =
                        parametrosAjuste != null
                          ? valorOverrideAtual(ln.id, parametrosAjuste.overrides, {
                              papel: parametrosAjuste.papel,
                              acabamento: parametrosAjuste.acabamento,
                              maquina: parametrosAjuste.maquina,
                              cores: parametrosAjuste.cores,
                              tubete: parametrosAjuste.tubete,
                              tipoTroca: parametrosAjuste.tipoTroca,
                              rebobinacaoNome:
                                parametrosAjuste.rebobinacaoNome ??
                                tarifas.rebobinacao ??
                                'REBOBINAÇÃO',
                              comissaoPct,
                              impostoPct,
                              tintaUsaAcima,
                            })
                          : ln.id === 'comissao' || ln.id === 'imposto'
                            ? ln.valorUsado
                            : null;
                      const draftVal = draft[ln.draftKey];
                      const showDraft =
                        draftVal !== undefined
                          ? draftVal
                          : existente != null
                            ? String(existente)
                            : '';
                      return (
                        <tr key={ln.id}>
                          <td>
                            <strong>{ln.label}</strong>
                          </td>
                          <td className="field-note">{ln.parametro}</td>
                          <td className="orc-params-valor">
                            {formatParamValue(ln.valorUsado, ln.unidade)}
                          </td>
                          <td>
                            {ln.resultadoRs != null ? formatCurrency(ln.resultadoRs) : '—'}
                          </td>
                          {editavel ? (
                            <td>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="orc-params-input"
                                aria-label={`Ajuste ${ln.label}`}
                                placeholder={
                                  ln.valorUsado != null
                                    ? ln.valorUsado.toLocaleString('pt-BR', {
                                        maximumFractionDigits: 6,
                                      })
                                    : 'default'
                                }
                                value={showDraft}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [ln.draftKey]: e.target.value,
                                  }))
                                }
                              />
                              <span className="orc-params-unidade">{ln.unidade}</span>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {editavel ? (
                <div className="btn-row" style={{ marginTop: '0.65rem' }}>
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
                      onClick={() => setDraft({})}
                    >
                      Descartar rascunho
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="orc-fluxo-subtitulo">Trilha das regras (R1–R20)</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Regra</th>
                      <th>Resultado</th>
                      <th>Parâmetro no snapshot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((ln) => (
                      <tr key={ln.regra}>
                        <td>
                          <strong>{ln.regra}</strong>
                        </td>
                        <td>{ln.valor}</td>
                        <td className="field-note">{ln.param ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
  modoServico,
}: {
  faixas: OrcamentoFaixaResult[];
  facaNova: boolean;
  valorFacaNova?: number;
  mostrarFrete: boolean;
  modoServico?: boolean;
}) {
  const sortGetters = useMemo(
    () => ({
      quantidade: (fx: OrcamentoFaixaResult) => Number(fx.quantidade) || 0,
      etiqueta: (fx: OrcamentoFaixaResult) => Number(fx.valor_etiqueta) || 0,
      unitario: (fx: OrcamentoFaixaResult) => {
        const q = Number(fx.quantidade) || 1;
        return (Number(fx.valor_etiqueta) || 0) / q;
      },
      matriz: (fx: OrcamentoFaixaResult) => Number(fx.valor_matriz) || 0,
      faca_nova: (fx: OrcamentoFaixaResult) =>
        Number(fx.valor_faca_nova ?? valorFacaNova ?? 0),
      total: (fx: OrcamentoFaixaResult) => totalPropostaFaixa(fx, facaNova, valorFacaNova),
    }),
    [facaNova, valorFacaNova],
  );

  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(faixas, sortGetters);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="quantidade" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Qtd.
            </SortableTh>
            <SortableTh column="etiqueta" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              {modoServico ? 'Serviço' : 'Etiqueta'}
            </SortableTh>
            <SortableTh column="unitario" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Unitário
            </SortableTh>
            {modoServico ? null : (
            <SortableTh column="matriz" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Matriz
            </SortableTh>
            )}
            {facaNova ? (
              <SortableTh column="faca_nova" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                Faca nova
              </SortableTh>
            ) : null}
            {mostrarFrete ? (
              <th>Frete est.</th>
            ) : null}
            <SortableTh column="total" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
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
                <td>{q.toLocaleString('pt-BR')}</td>
                <td>{formatCurrency(et)}</td>
                <td>{formatCurrency(et / q)}</td>
                {modoServico ? null : <td>{formatCurrency(fx.valor_matriz)}</td>}
                {facaNova ? (
                  <td>{formatCurrency(fx.valor_faca_nova ?? valorFacaNova ?? 0)}</td>
                ) : null}
                {mostrarFrete ? (
                  <td>{formatValorFrete(fx.valor_frete, fx.frete_somavel)}</td>
                ) : null}
                <td>
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
  facaDesenho,
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

  const desenhoProps: OrcamentoFacaDesenhoProps | null = servico
    ? null
    : facaDesenho
      ? {
          ...facaDesenho,
          formato: facaDesenho.formato || calculo.formato_faca,
          facaNova: facaDesenho.facaNova ?? Boolean(calculo.faca_nova),
        }
      : calculo.formato_faca
        ? {
            formato: calculo.formato_faca,
            facaNova: Boolean(calculo.faca_nova),
          }
        : null;
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
                Composição do custo
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

        {echoEspecificacao && desenhoProps && abaAtiva === 'comercial' ? (
          <div className="orc-resultado-faca">
            <OrcamentoFacaDesenho {...desenhoProps} variant="inline" />
          </div>
        ) : null}

        {abaAtiva !== 'producao' ? (
          <p className="orc-result-meta">
            {servico ? (
              <>
                Preço comercial informado · arredondamento para cima em múltiplo de R$ 10
                {prazoEntregaDias != null ? ` · prazo ${prazoEntregaDias} d.úteis` : ''}
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
              ? ` · prazo ${prazoEntregaDias} d.úteis`
              : ''}
            {echoEspecificacao && validadeDias != null ? ` · validade ${validadeDias} dias` : ''}
            {echoEspecificacao && toleranciaQtdPct != null ? ` · ±${toleranciaQtdPct}%` : ''}
            {calculo.frete
              ? ` · ${modoEntregaLabel(calculo.frete.modo)}${
                  origemFreteLabel(calculo.frete.origem)
                    ? ` · ${origemFreteLabel(calculo.frete.origem)?.toLowerCase()}`
                    : ''
                }${
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
              modoServico={servico}
            />
            {calculo.frete ? (
              <p className="orc-result-meta" style={{ marginTop: '0.65rem' }}>
                {calculo.frete.modo === 'ENTREGAR'
                  ? String(calculo.frete.origem).toUpperCase() === ORIGEM_MANUAL
                    ? [
                        'Origem manual',
                        calculo.frete.destino_label || null,
                        freteMotivoLabel(calculo.frete.motivo),
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : [
                      (() => {
                        const kmTxt = formatDecimalBr(calculo.frete.km, 3);
                        return kmTxt !== '—' && !/^0,0+$/.test(kmTxt) ? `${kmTxt} km` : null;
                      })(),
                      calculo.frete.destino_label || null,
                      calculo.frete.peso_caixa_kg
                        ? `${formatDecimalBr(calculo.frete.peso_caixa_kg, 3)} kg/caixa`
                        : null,
                      freteMotivoLabel(calculo.frete.motivo) ??
                        'estimado por km e peso da caixa',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : freteMotivoLabel(calculo.frete.motivo)}
                {' '}
                · linha à parte, fora do unitário
              </p>
            ) : null}
          </>
        ) : null}

        {abaAtiva === 'interno' ? (
          <>
            <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
              {faixas.map((fx, i) => (
                <button
                  key={i}
                  type="button"
                  className={`btn btn-sm ${faixaDetalhe === i ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFaixaDetalhe(i)}
                >
                  {Number(fx.quantidade).toLocaleString('pt-BR')} un.
                </button>
              ))}
            </div>
            {detalhe ? (
              <div className="breakdown-grid">
                <div>
                  <span>Papel</span>
                  <strong>{formatCurrency(detalhe.valor_papel)}</strong>
                </div>
                <div>
                  <span>Máquina</span>
                  <strong>{formatCurrency(detalhe.valor_maquina)}</strong>
                </div>
                <div>
                  <span>Troca produto</span>
                  <strong>{formatCurrency(detalhe.valor_troca_produto)}</strong>
                </div>
                <div>
                  <span>Troca bobina</span>
                  <strong>{formatCurrency(detalhe.valor_troca_bobina)}</strong>
                </div>
                <div>
                  <span>Tinta</span>
                  <strong>{formatCurrency(detalhe.valor_tinta)}</strong>
                </div>
                <div>
                  <span>Acabamento</span>
                  <strong>{formatCurrency(detalhe.valor_acabamento)}</strong>
                </div>
                <div>
                  <span>Rebobinação</span>
                  <strong>{formatCurrency(detalhe.valor_rebobinacao)}</strong>
                </div>
                <div>
                  <span>Tubete</span>
                  <strong>{formatCurrency(detalhe.valor_tubete)}</strong>
                </div>
                <div>
                  <span>Caixa</span>
                  <strong>{formatCurrency(detalhe.valor_caixa)}</strong>
                </div>
                <div>
                  <span>Comissão</span>
                  <strong>{formatCurrency(detalhe.comissao)}</strong>
                </div>
                <div>
                  <span>Imposto (est.)</span>
                  <strong>{formatCurrency(detalhe.imposto)}</strong>
                </div>
                <div>
                  <span>Metragem</span>
                  <strong>{formatDecimalBr(detalhe.metragem, 1)} m</strong>
                </div>
                <div>
                  <span>m²</span>
                  <strong>{formatDecimalBr(detalhe.m2, 2)}</strong>
                </div>
                <div>
                  <span>Rolos / caixas</span>
                  <strong>
                    {Number(detalhe.rolos).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} /{' '}
                    {detalhe.qtde_caixas}
                  </strong>
                </div>
                <div className="breakdown-total">
                  <span>Serviço arredondado</span>
                  <strong>{formatCurrency(detalhe.valor_etiqueta)}</strong>
                </div>
                <div className="breakdown-total">
                  <span>Total c/ matriz</span>
                  <strong>{formatCurrency(detalhe.valor_total)}</strong>
                </div>
                {calculo.frete ? (
                  <div className="breakdown-total">
                    <span>Frete estimado</span>
                    <strong>{formatValorFrete(detalhe.valor_frete, detalhe.frete_somavel)}</strong>
                  </div>
                ) : null}
                {calculo.faca_nova || detalhe.frete_somavel ? (
                  <div className="breakdown-total">
                    <span>Total da proposta</span>
                    <strong>
                      {formatCurrency(
                        totalPropostaFaixa(detalhe, Boolean(calculo.faca_nova), calculo.valor_faca_nova),
                      )}
                    </strong>
                  </div>
                ) : null}
              </div>
            ) : null}
            {detalhe ? (
              <FluxoCalculoPanel
                detalhe={detalhe}
                snapshot={calculo.catalog_snapshot}
                faixaIndex={faixaDetalhe}
                parametrosAjuste={
                  parametrosAjuste
                    ? {
                        ...parametrosAjuste,
                        comissaoPct:
                          parametrosAjuste.comissaoPctByFaixa?.[faixaDetalhe] ??
                          parametrosAjuste.comissaoPct,
                      }
                    : null
                }
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
            {detalhe && calculo.frete?.modo === 'ENTREGAR' ? (
              <p className="orc-result-meta" style={{ marginTop: '0.65rem' }}>
                {explicarFechamentoFrete(detalhe, calculo.frete.km, calculo.frete.origem) ??
                  freteMotivoLabel(calculo.frete.motivo) ??
                  'Frete à parte — não entra no unitário da etiqueta.'}
              </p>
            ) : null}
            {detalhe && Number(detalhe.metragem) < 1000 ? (
              <p className="orc-result-meta" style={{ marginTop: '0.75rem' }}>
                Metragem abaixo de 1.000 m — sem cobrança típica de troca de bobina.
              </p>
            ) : null}
          </>
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
