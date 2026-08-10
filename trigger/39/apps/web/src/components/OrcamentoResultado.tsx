import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OrcamentoFaixaResult, OrcamentoResult } from '../lib/api';
import { formatCurrency, formatDecimalBr } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';
import { SortableTh } from './SortableTh';
import {
  OrcamentoFacaDesenho,
  type OrcamentoFacaDesenhoProps,
} from './OrcamentoFacaDesenho';

type Props = {
  calculo: OrcamentoResult;
  prazoEntregaDias?: number;
  validadeDias?: number;
  toleranciaQtdPct?: number | string;
  /** Desenho da faca (input_snapshot) — reforço visual na proposta */
  facaDesenho?: OrcamentoFacaDesenhoProps | null;
};

function ComercialFaixasTable({
  faixas,
  facaNova,
  valorFacaNova,
}: {
  faixas: OrcamentoFaixaResult[];
  facaNova: boolean;
  valorFacaNova?: number;
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

export function OrcamentoResultado({
  calculo,
  prazoEntregaDias,
  validadeDias,
  toleranciaQtdPct,
  facaDesenho,
}: Props) {
  const [aba, setAba] = useState<'comercial' | 'interno'>('comercial');
  const [faixaDetalhe, setFaixaDetalhe] = useState(0);
  const faixas = calculo.faixas ?? [];
  const detalhe = faixas[faixaDetalhe];

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
        <div className="orc-result-tabs">
          <button
            type="button"
            className={aba === 'comercial' ? 'active' : ''}
            onClick={() => setAba('comercial')}
          >
            Proposta comercial
          </button>
          <button
            type="button"
            className={aba === 'interno' ? 'active' : ''}
            onClick={() => setAba('interno')}
          >
            Breakdown interno
          </button>
        </div>

        {desenhoProps && aba === 'comercial' ? (
          <div className="orc-resultado-faca">
            <OrcamentoFacaDesenho {...desenhoProps} variant="inline" />
          </div>
        ) : null}

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
          {prazoEntregaDias != null ? ` · prazo ${prazoEntregaDias} d.úteis` : ''}
          {validadeDias != null ? ` · validade ${validadeDias} dias` : ''}
          {toleranciaQtdPct != null ? ` · ±${toleranciaQtdPct}%` : ''}
        </p>

        {aba === 'comercial' ? (
          <ComercialFaixasTable
            faixas={faixas}
            facaNova={Boolean(calculo.faca_nova)}
            valorFacaNova={calculo.valor_faca_nova}
          />
        ) : (
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
        )}
      </div>
    </section>
  );
}
