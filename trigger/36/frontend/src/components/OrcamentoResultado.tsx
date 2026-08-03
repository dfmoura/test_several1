import { useState } from 'react';
import { formatMoney, formatQty } from '../lib/api';
import type { ApiRow } from '../types';

interface Props {
  calculo: ApiRow;
  prazoEntregaDias?: number;
  validadeDias?: number;
  toleranciaQtdPct?: number;
  faixaHighlight?: number | null;
  selectable?: boolean;
  selectedFaixa?: number;
  onSelectFaixa?: (idx: number) => void;
}

export function OrcamentoResultado({
  calculo,
  prazoEntregaDias,
  validadeDias,
  toleranciaQtdPct,
  faixaHighlight = null,
  selectable = false,
  selectedFaixa = 0,
  onSelectFaixa,
}: Props) {
  const [aba, setAba] = useState<'comercial' | 'interno'>('comercial');
  const [faixaDetalhe, setFaixaDetalhe] = useState(0);
  const faixas = (calculo.faixas as ApiRow[]) ?? [];
  const detalhe = faixas[faixaDetalhe] as ApiRow | undefined;

  return (
    <section className="panel orc-resultado">
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
      <p className="muted">
        Matriz: {calculo.cobra_matriz ? formatMoney(calculo.valor_matriz as number) : 'Isenta'} · chave{' '}
        {String(calculo.chave_matriz)}
        {prazoEntregaDias != null ? ` · prazo ${prazoEntregaDias} d.úteis` : ''}
        {validadeDias != null ? ` · validade ${validadeDias} dias` : ''}
        {toleranciaQtdPct != null ? ` · ±${toleranciaQtdPct}%` : ''}
      </p>

      {aba === 'comercial' ? (
        <table className="data">
          <thead>
            <tr>
              {selectable ? <th></th> : null}
              <th>Qtd.</th>
              <th>Etiqueta</th>
              <th>Unitário</th>
              <th>Matriz</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((fx, i) => {
              const q = Number(fx.quantidade) || 1;
              const et = Number(fx.valor_etiqueta) || 0;
              const highlighted = faixaHighlight === i || (selectable && selectedFaixa === i);
              return (
                <tr
                  key={i}
                  className={highlighted ? 'row-selected' : undefined}
                  onClick={selectable && onSelectFaixa ? () => onSelectFaixa(i) : undefined}
                  style={selectable ? { cursor: 'pointer' } : undefined}
                >
                  {selectable ? (
                    <td>
                      <input
                        type="radio"
                        name="faixa-escolhida"
                        checked={selectedFaixa === i}
                        onChange={() => onSelectFaixa?.(i)}
                      />
                    </td>
                  ) : null}
                  <td>{formatQty(q, 0)}</td>
                  <td>{formatMoney(et)}</td>
                  <td>{formatMoney(et / q)}</td>
                  <td>{formatMoney(fx.valor_matriz as number)}</td>
                  <td>
                    <strong>{formatMoney(fx.valor_total as number)}</strong>
                    {faixaHighlight === i ? <span className="chip" style={{ marginLeft: 8 }}>escolhida</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <>
          <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
            {faixas.map((fx, i) => (
              <button
                key={i}
                type="button"
                className={`btn sm${faixaDetalhe === i ? ' primary' : ''}`}
                onClick={() => setFaixaDetalhe(i)}
              >
                {formatQty(fx.quantidade as number, 0)} un.
              </button>
            ))}
          </div>
          {detalhe ? (
            <div className="breakdown-grid">
              <div>
                <span>Papel</span>
                <strong>{formatMoney(detalhe.valor_papel as number)}</strong>
              </div>
              <div>
                <span>Máquina</span>
                <strong>{formatMoney(detalhe.valor_maquina as number)}</strong>
              </div>
              <div>
                <span>Troca produto</span>
                <strong>{formatMoney(detalhe.valor_troca_produto as number)}</strong>
              </div>
              <div>
                <span>Troca bobina</span>
                <strong>{formatMoney(detalhe.valor_troca_bobina as number)}</strong>
              </div>
              <div>
                <span>Tinta</span>
                <strong>{formatMoney(detalhe.valor_tinta as number)}</strong>
              </div>
              <div>
                <span>Acabamento</span>
                <strong>{formatMoney(detalhe.valor_acabamento as number)}</strong>
              </div>
              <div>
                <span>Rebobinação</span>
                <strong>{formatMoney(detalhe.valor_rebobinacao as number)}</strong>
              </div>
              <div>
                <span>Tubete</span>
                <strong>{formatMoney(detalhe.valor_tubete as number)}</strong>
              </div>
              <div>
                <span>Caixa</span>
                <strong>{formatMoney(detalhe.valor_caixa as number)}</strong>
              </div>
              <div>
                <span>Comissão</span>
                <strong>{formatMoney(detalhe.comissao as number)}</strong>
              </div>
              <div>
                <span>Imposto</span>
                <strong>{formatMoney(detalhe.imposto as number)}</strong>
              </div>
              <div>
                <span>Metragem</span>
                <strong>{formatQty(detalhe.metragem as number, 1)} m</strong>
              </div>
              <div>
                <span>m²</span>
                <strong>{formatQty(detalhe.m2 as number, 2)}</strong>
              </div>
              <div>
                <span>Rolos / caixas</span>
                <strong>
                  {formatQty(detalhe.rolos as number, 0)} / {formatQty(detalhe.qtde_caixas as number, 0)}
                </strong>
              </div>
              <div className="breakdown-total">
                <span>Serviço arredondado</span>
                <strong>{formatMoney(detalhe.valor_etiqueta as number)}</strong>
              </div>
              <div className="breakdown-total">
                <span>Total c/ matriz</span>
                <strong>{formatMoney(detalhe.valor_total as number)}</strong>
              </div>
            </div>
          ) : null}
          {detalhe && Number(detalhe.metragem) < 1000 ? (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              Metragem &lt; 1000 m — sem cobrança típica de troca de bobina (motor R1–R20).
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
