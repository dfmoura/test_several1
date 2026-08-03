"use client";

import type { QuoteResult } from "@orcamento/pricing-engine";
import { formatBrl, formatNum, formatQtde } from "@/lib/orcamento-comercial";

function money(n: number) {
  return formatBrl(n);
}

function n(v: number, d = 2) {
  return formatNum(v, d);
}

export function QuoteResultTables({
  result,
  form,
}: {
  result: QuoteResult;
  form: {
    clienteNome: string;
    medida: string;
    puxada: number;
    z: number | null;
    formatoFaca: string;
    repeticao: number;
    cores: number | "4V";
    papel: string;
    acabamento: string;
    etiqPorRolo: number;
    maquinaRoda: string;
    maquinaGrupo: string;
    matriz: boolean;
    matrizJaCobrada: boolean;
    prazoEntrega: string;
    validadeProposta: string;
    toleranciaQtdPct: number;
  };
}) {
  const faixas = result.faixas;
  const vm = result.valorMatriz;

  return (
    <div className="orc-result">
      <div className="orc-sheet-head">
        <h2>Cálculo orçamento</h2>
        <p
          className={`orc-matriz-status ${result.matrizCobrada ? "ok" : "warn"}`}
          role="status"
        >
          {result.matrizCobrada
            ? `Matriz SIM — cobrada neste pedido: ${money(vm)}`
            : form.matriz && form.matrizJaCobrada
              ? "Matriz não cobrada (já utilizada ou desligada neste pedido)"
              : "Matriz não cobrada"}
        </p>
      </div>

      {result.alerts?.length > 0 && (
        <div className="alert-warn" role="status">
          {result.alerts.join(" · ")}
        </div>
      )}

      <h3 className="orc-sheet-section">Cálculo dos valores</h3>
      <p className="orc-hint">Equivalente às colunas B–O (linhas 12–17) da planilha.</p>
      <div className="orc-table-wrap">
        <table className="orc-sheet-table">
          <thead>
            <tr>
              <th>Qtde</th>
              <th>Troca produto</th>
              <th>Hora máquina</th>
              <th>
                Hora troca produto
                <br />
                <small>auto: tempo × (modelos−1)</small>
              </th>
              <th>
                Hora troca bobina
                <br />
                <small>só se metragem ≥1000</small>
              </th>
              <th>
                Metragem linear
                <br />
                <small>&lt;1000 = sem troca bobina</small>
              </th>
              <th>Metragem m²</th>
              <th>Perda acerto</th>
              <th>Perda acabamento</th>
              <th>
                Perda papel troca produto
                <br />
                <small>PERDA ACERTO × modelos</small>
              </th>
              <th>Perda troca bobina m²</th>
              <th>Quant rolos</th>
              <th>
                Quant caixas
                <br />
                <small>CEILING(rolos ÷ cap.)</small>
              </th>
              <th>
                Caixa / cap.
                <br />
                <small>MEDIDA_CAIXAS</small>
              </th>
              <th>Matriz</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => {
              const p = f.production;
              const low = p.metragemLinear < 1000;
              return (
                <tr key={`calc-${p.quantidade}`}>
                  <td>{formatQtde(p.quantidade)}</td>
                  <td>{p.tipoParada}</td>
                  <td>{n(p.horaMaquina, 3)}</td>
                  <td>{n(p.horaTrocaProduto, 3)}</td>
                  <td>{p.horaTrocaBobina > 0 ? n(p.horaTrocaBobina, 3) : "—"}</td>
                  <td className={low ? "muted-cell" : undefined}>{n(p.metragemLinear, 2)}</td>
                  <td>{n(p.metragemM2, 1)}</td>
                  <td>{n(p.perdaAcerto, 2)}</td>
                  <td>{n(p.perdaAcabamento, 2)}</td>
                  <td>{n(p.perdaPapelTrocaProduto, 2)}</td>
                  <td>{n(p.perdaTrocaBobinaM2, 2)}</td>
                  <td>{n(p.qtdeRolos, 2)}</td>
                  <td>{p.qtdeCaixas}</td>
                  <td>{p.rolosPorCaixa}/cx</td>
                  <td>{money(f.commercial.valorMatriz)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="orc-sheet-section">Valores de custo</h3>
      <p className="orc-hint">Equivalente às colunas B–M (linhas 20–25).</p>
      <div className="orc-table-wrap">
        <table className="orc-sheet-table">
          <thead>
            <tr>
              <th>Qtde</th>
              <th>Valor papel</th>
              <th>Valor máquina</th>
              <th>Valor troca produto</th>
              <th>Valor troca bobina</th>
              <th>Valor papel troca produto</th>
              <th>Tinta</th>
              <th>Acabamento</th>
              <th>Rebobinação</th>
              <th>Tubete</th>
              <th>Valor caixa</th>
              <th>Valor serviço</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={`custo-${f.production.quantidade}`}>
                <td>{formatQtde(f.production.quantidade)}</td>
                <td>{money(f.costs.valorPapel)}</td>
                <td>{money(f.costs.valorMaquina)}</td>
                <td>{money(f.costs.valorTrocaProduto)}</td>
                <td>{money(f.costs.valorTrocaBobina)}</td>
                <td>{money(f.costs.valorPapelTrocaProduto)}</td>
                <td>{money(f.costs.tinta)}</td>
                <td>{money(f.costs.acabamento)}</td>
                <td>{money(f.costs.rebobinacao)}</td>
                <td>{money(f.costs.tubete)}</td>
                <td>{money(f.costs.valorCaixa)}</td>
                <td className="strong">{money(f.costs.valorServico)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="orc-sheet-section">Comissão · imposto · totais</h3>
      <p className="orc-hint">
        CEILING 10 na etiqueta; matriz em todas as faixas se cobrável neste pedido.
      </p>
      <div className="orc-table-wrap">
        <table className="orc-sheet-table">
          <thead>
            <tr>
              <th>% Comissão</th>
              <th>Comissão</th>
              <th>Imposto</th>
              <th>Serviço + imposto + comissão</th>
              <th>Etiquetas</th>
              <th>Valor da etiqueta</th>
              <th>Valor da matriz</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={`tot-${f.production.quantidade}`}>
                <td>{n(f.commercial.comissaoPct, 1)}%</td>
                <td>{money(f.commercial.comissao)}</td>
                <td>{money(f.commercial.imposto)}</td>
                <td>{money(f.commercial.servicoEncargos)}</td>
                <td>{formatQtde(f.production.quantidade)}</td>
                <td className="strong">{money(f.commercial.valorEtiqueta)}</td>
                <td>{money(f.commercial.valorMatriz)}</td>
                <td className="total">{money(f.commercial.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="orc-sheet-section">Proposta (CONSOLIDADO)</h3>
      <div className="orc-table-wrap">
        <table className="orc-sheet-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Acabamento</th>
              <th>Etiq por rolo</th>
              <th>Rolos</th>
              <th>Etiquetas</th>
              <th>Total</th>
              <th>Unitário</th>
              <th>Valor rolo</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => {
              const q = f.production.quantidade;
              const rolos = f.production.qtdeRolos || 1;
              const tot = f.commercial.valorEtiqueta;
              return (
                <tr key={`prop-${q}`}>
                  <td>{form.papel}</td>
                  <td>{form.acabamento}</td>
                  <td>{form.etiqPorRolo}</td>
                  <td>{n(rolos, 2)}</td>
                  <td>{formatQtde(q)}</td>
                  <td className="strong">{money(tot)}</td>
                  <td>{money(tot / q)}</td>
                  <td>{money(tot / rolos)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="orc-proposta-box">
        <div className="orc-prop-grid">
          <div>
            <span>Cliente</span>
            <strong>{form.clienteNome}</strong>
          </div>
          <div>
            <span>Medida</span>
            <strong>{form.medida || "—"}</strong>
          </div>
          <div>
            <span>Puxada / Z / REP</span>
            <strong>
              {n(form.puxada, 5)} / {form.z ?? "—"} / {form.repeticao || "—"}
            </strong>
          </div>
          <div>
            <span>Faca</span>
            <strong>{form.formatoFaca || "—"}</strong>
          </div>
          <div>
            <span>Cores</span>
            <strong>{String(form.cores)}</strong>
          </div>
          <div>
            <span>Máq. F10 · G10</span>
            <strong>
              {form.maquinaRoda || "—"} · {form.maquinaGrupo}
            </strong>
          </div>
          <div>
            <span>Valor da matriz</span>
            <strong>{money(vm)}</strong>
          </div>
          <div>
            <span>Prazo · Validade</span>
            <strong>
              {form.prazoEntrega} · {form.validadeProposta}
            </strong>
          </div>
        </div>
        <p className="orc-prop-note">
          As quantidades poderão variar ±{form.toleranciaQtdPct}% e serão faturadas ao
          cliente. Matriz somente no 1º pedido (quando cobrada).
        </p>
      </div>

      <h3 className="orc-sheet-section">Insumos do orçamento</h3>
      <p className="orc-hint">
        Quantidades derivadas do mesmo motor. Cada coluna é uma faixa alternativa — o
        cliente escolhe uma.
      </p>
      <div className="orc-table-wrap">
        <table className="orc-sheet-table">
          <thead>
            <tr>
              <th>Insumo</th>
              {faixas.map((f) => (
                <th key={`ih-${f.production.quantidade}`}>
                  Qtde {formatQtde(f.production.quantidade)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Papel consumo (m²)", (f: (typeof faixas)[0]) => n(f.production.metragemM2, 1)],
                ["Metragem linear (m)", (f: (typeof faixas)[0]) => n(f.production.metragemLinear, 2)],
                ["Perda acerto (m²)", (f: (typeof faixas)[0]) => n(f.production.perdaAcerto, 2)],
                [
                  "Perda troca produto (m²)",
                  (f: (typeof faixas)[0]) => n(f.production.perdaPapelTrocaProduto, 2),
                ],
                [
                  "Perda troca bobina (m²)",
                  (f: (typeof faixas)[0]) => n(f.production.perdaTrocaBobinaM2, 2),
                ],
                [
                  "Papel total (m²)",
                  (f: (typeof faixas)[0]) =>
                    n(
                      f.production.metragemM2 +
                        f.production.perdaAcerto +
                        f.production.perdaTrocaBobinaM2,
                      2,
                    ),
                ],
                ["Tinta (R$)", (f: (typeof faixas)[0]) => money(f.costs.tinta)],
                ["Acabamento (R$)", (f: (typeof faixas)[0]) => money(f.costs.acabamento)],
                ["Tubete (un)", (f: (typeof faixas)[0]) => n(f.production.qtdeRolos, 2)],
                ["Caixa (un)", (f: (typeof faixas)[0]) => String(f.production.qtdeCaixas)],
                ["Matriz (jogo)", () => (result.matrizCobrada ? "1" : "0")],
              ] as Array<[string, (f: (typeof faixas)[0]) => string]>
            ).map(([label, fn]) => (
              <tr key={label}>
                <td>{label}</td>
                {faixas.map((f) => (
                  <td key={`${label}-${f.production.quantidade}`}>{fn(f)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
