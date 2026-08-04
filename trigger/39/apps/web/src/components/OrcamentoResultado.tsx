import { useState } from 'react';
import type { OrcamentoResult } from '../lib/api';
import { formatCurrency, formatDecimalBr } from '../lib/format';

type Props = {
  calculo: OrcamentoResult;
  prazoEntregaDias?: number;
  validadeDias?: number;
  toleranciaQtdPct?: number | string;
};

export function OrcamentoResultado({
  calculo,
  prazoEntregaDias,
  validadeDias,
  toleranciaQtdPct,
}: Props) {
  const [aba, setAba] = useState<'comercial' | 'interno'>('comercial');
  const [faixaDetalhe, setFaixaDetalhe] = useState(0);
  const faixas = calculo.faixas ?? [];
  const detalhe = faixas[faixaDetalhe];

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

        <p className="orc-result-meta">
          Matriz:{' '}
          {calculo.cobra_matriz ? formatCurrency(calculo.valor_matriz) : 'Isenta'} · chave{' '}
          {calculo.chave_matriz}
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
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Qtd.</th>
                  <th>Etiqueta</th>
                  <th>Unitário</th>
                  <th>Matriz</th>
                  {calculo.faca_nova ? <th>Faca nova</th> : null}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((fx, i) => {
                  const q = Number(fx.quantidade) || 1;
                  const et = Number(fx.valor_etiqueta) || 0;
                  const totalComFaca =
                    fx.valor_total_com_faca != null
                      ? Number(fx.valor_total_com_faca)
                      : Number(fx.valor_total) + Number(calculo.valor_faca_nova ?? 0);
                  return (
                    <tr key={i}>
                      <td>{q.toLocaleString('pt-BR')}</td>
                      <td>{formatCurrency(et)}</td>
                      <td>{formatCurrency(et / q)}</td>
                      <td>{formatCurrency(fx.valor_matriz)}</td>
                      {calculo.faca_nova ? (
                        <td>{formatCurrency(fx.valor_faca_nova ?? calculo.valor_faca_nova ?? 0)}</td>
                      ) : null}
                      <td>
                        <strong>
                          {formatCurrency(calculo.faca_nova ? totalComFaca : fx.valor_total)}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
          </>
        )}
      </div>
    </section>
  );
}
