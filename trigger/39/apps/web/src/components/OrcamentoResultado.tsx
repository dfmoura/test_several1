import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrcamentoFaixaResult, OrcamentoResult } from '../lib/api';
import { formatCurrency, formatDecimalBr } from '../lib/format';
import type { ModeloComposicaoForm } from '../lib/orcamentoForm';
import {
  formatValorFrete,
  freteMotivoLabel,
  modoEntregaLabel,
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
};

function ComercialFaixasTable({
  faixas,
  facaNova,
  valorFacaNova,
  mostrarFrete,
}: {
  faixas: OrcamentoFaixaResult[];
  facaNova: boolean;
  valorFacaNova?: number;
  mostrarFrete: boolean;
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
      total: (fx: OrcamentoFaixaResult) => {
        const totalComFaca =
          fx.valor_total_com_faca != null
            ? Number(fx.valor_total_com_faca)
            : Number(fx.valor_total) + Number(valorFacaNova ?? 0);
        return facaNova ? totalComFaca : Number(fx.valor_total);
      },
    }),
    [facaNova, valorFacaNova],
  );

  const { sorted, sortKey, sortDir, requestSort } = useTableSort(faixas, sortGetters);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTh column="quantidade" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Qtd.
            </SortableTh>
            <SortableTh column="etiqueta" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Etiqueta
            </SortableTh>
            <SortableTh column="unitario" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Unitário
            </SortableTh>
            <SortableTh column="matriz" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Matriz
            </SortableTh>
            {facaNova ? (
              <SortableTh column="faca_nova" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                Faca nova
              </SortableTh>
            ) : null}
            {mostrarFrete ? (
              <th>Frete est.</th>
            ) : null}
            <SortableTh column="total" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
              Total
            </SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((fx, i) => {
            const q = Number(fx.quantidade) || 1;
            const et = Number(fx.valor_etiqueta) || 0;
            const totalComFaca =
              fx.valor_total_com_faca != null
                ? Number(fx.valor_total_com_faca)
                : Number(fx.valor_total) + Number(valorFacaNova ?? 0);
            return (
              <tr key={i}>
                <td>{q.toLocaleString('pt-BR')}</td>
                <td>{formatCurrency(et)}</td>
                <td>{formatCurrency(et / q)}</td>
                <td>{formatCurrency(fx.valor_matriz)}</td>
                {facaNova ? (
                  <td>{formatCurrency(fx.valor_faca_nova ?? valorFacaNova ?? 0)}</td>
                ) : null}
                {mostrarFrete ? (
                  <td>{formatValorFrete(fx.valor_frete, fx.frete_somavel)}</td>
                ) : null}
                <td>
                  <strong>{formatCurrency(facaNova ? totalComFaca : fx.valor_total)}</strong>
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
        Lista operacional do que o cálculo prevê para produzir — sem preços. Baixa real e
        SKU ficam na OP futura (estudo 32 · PRODUÇÃO).
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
}: Props) {
  const [aba, setAba] = useState<AbaResultado>('comercial');
  const [faixaDetalhe, setFaixaDetalhe] = useState(0);
  const faixas = calculo.faixas ?? [];
  const detalhe = faixas[faixaDetalhe];
  const modelosVisiveis = (modelosComposicao ?? []).filter(
    (m) => String(m.nome ?? '').trim() !== '',
  );

  const desenhoProps: OrcamentoFacaDesenhoProps | null = facaDesenho
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

  return (
    <section className="card orc-resultado">
      <div className="card-body">
        <div className="orc-result-tabs" role="tablist" aria-label="Visões do orçamento">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'comercial'}
            className={aba === 'comercial' ? 'active' : ''}
            onClick={() => setAba('comercial')}
          >
            Proposta comercial
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'interno'}
            className={aba === 'interno' ? 'active' : ''}
            onClick={() => setAba('interno')}
          >
            Breakdown interno
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'producao'}
            className={aba === 'producao' ? 'active' : ''}
            onClick={() => setAba('producao')}
          >
            Guia de produção
          </button>
        </div>

        {echoEspecificacao && desenhoProps && aba === 'comercial' ? (
          <div className="orc-resultado-faca">
            <OrcamentoFacaDesenho {...desenhoProps} variant="inline" />
          </div>
        ) : null}

        {aba !== 'producao' ? (
          <p className="orc-result-meta">
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
            })()}{' '}
            · chave {calculo.chave_matriz}
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
                  calculo.frete.destino_label ? ` (${calculo.frete.destino_label})` : ''
                }`
              : ''}
          </p>
        ) : null}

        {aba === 'comercial' ? (
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
            />
            {calculo.frete ? (
              <p className="orc-result-meta" style={{ marginTop: '0.65rem' }}>
                {calculo.frete.modo === 'ENTREGAR'
                  ? [
                      calculo.frete.km != null && calculo.frete.km !== ''
                        ? `${formatDecimalBr(calculo.frete.km, 1)} km`
                        : null,
                      calculo.frete.peso_caixa_kg
                        ? `${formatDecimalBr(calculo.frete.peso_caixa_kg, 3)} kg/caixa`
                        : null,
                      freteMotivoLabel(calculo.frete.motivo),
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : freteMotivoLabel(calculo.frete.motivo)}
                {' '}
                · linha à parte, não entra no unitário da etiqueta
              </p>
            ) : null}
          </>
        ) : null}

        {aba === 'interno' ? (
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
              </div>
            ) : null}
            {detalhe && Number(detalhe.metragem) < 1000 ? (
              <p className="orc-result-meta" style={{ marginTop: '0.75rem' }}>
                Metragem &lt; 1000 m — sem cobrança típica de troca de bobina (motor R1–R20 ·
                GERACAO_ORCAMENTO).
              </p>
            ) : null}
            <p className="orc-result-meta" style={{ marginTop: '0.65rem' }}>
              Quer entender cada linha?{' '}
              <Link to="/orcamentos/como-calcula">Ver como o orçamento calcula</Link>
            </p>
          </>
        ) : null}

        {aba === 'producao' ? (
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
