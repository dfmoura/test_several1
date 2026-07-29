"use client";

import {
  docStatusChip,
  fmtQtde,
  fmtWhen,
  money,
  pcStatusChip,
  type PedidoCompra,
} from "./compras-types";

export function PedidosCompraTab({
  pedidos,
  activePc,
  activePcId,
  fornecedorNome,
  xml,
  busy,
  onSelectPc,
  onFornecedorChange,
  onXmlChange,
  onEnviar,
  onCancelar,
  onCarregarXml,
  onImportarXml,
}: {
  pedidos: PedidoCompra[];
  activePc: PedidoCompra | null;
  activePcId: string | null;
  fornecedorNome: string;
  xml: string;
  busy: boolean;
  onSelectPc: (id: string) => void;
  onFornecedorChange: (v: string) => void;
  onXmlChange: (v: string) => void;
  onEnviar: () => void;
  onCancelar: () => void;
  onCarregarXml: () => void;
  onImportarXml: () => void;
}) {
  return (
    <div className="compras-pc-layout">
      <aside className="card-panel compras-pc-list">
        <div className="jornada-section-head">
          <h2>Pedidos</h2>
        </div>
        {!pedidos.length && (
          <p className="muted">
            Nenhum pedido de compra. Vá em Necessidades e gere o primeiro.
          </p>
        )}
        <ul className="pc-list">
          {pedidos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`pc-list-item ${activePcId === p.id ? "is-active" : ""}`}
                onClick={() => onSelectPc(p.id)}
              >
                <div className="pc-list-top">
                  <strong>PC #{p.numero}</strong>
                  <span className={pcStatusChip(p.status)}>{p.statusLabel}</span>
                </div>
                <span className="muted">
                  {p.qtdItens} item(ns)
                  {p.pedidosOrigem.length
                    ? ` · PV ${p.pedidosOrigem.map((o) => `#${o.numero}`).join(", ")}`
                    : ""}
                </span>
                <span className="muted">{fmtWhen(p.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="card-panel jornada-section compras-pc-detail">
        {!activePc && (
          <p className="muted">Selecione um pedido de compra na lista.</p>
        )}
        {activePc && (
          <>
            <div className="jornada-section-head">
              <div>
                <h2>Pedido de compra #{activePc.numero}</h2>
                <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                  Criado {fmtWhen(activePc.createdAt)}
                  {activePc.enviadoEm ? ` · Enviado ${fmtWhen(activePc.enviadoEm)}` : ""}
                  {activePc.recebidoEm
                    ? ` · Recebido ${fmtWhen(activePc.recebidoEm)}`
                    : ""}
                </p>
              </div>
              <span className={pcStatusChip(activePc.status)}>{activePc.statusLabel}</span>
            </div>

            {!!activePc.pedidosOrigem.length && (
              <div className="compras-origem">
                <span className="muted">Origem (pedidos de venda)</span>
                <div className="compras-origem-tags">
                  {activePc.pedidosOrigem.map((o) => (
                    <span key={o.numero} className="chip chip-soft">
                      PV #{o.numero} · {o.clienteNome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="compras-pc-actions">
              <label className="compras-fornecedor">
                Fornecedor
                <input
                  value={fornecedorNome}
                  onChange={(e) => onFornecedorChange(e.target.value)}
                  placeholder="Nome do fornecedor (opcional)"
                  disabled={activePc.status === "RECEBIDO" || activePc.status === "CANCELADO"}
                />
              </label>
              <div className="jornada-cta">
                {(activePc.status === "RASCUNHO" || activePc.status === "ENVIADO") && (
                  <button type="button" disabled={busy} onClick={onEnviar}>
                    {activePc.status === "ENVIADO"
                      ? "Atualizar envio"
                      : "Marcar como enviado"}
                  </button>
                )}
                {activePc.status !== "RECEBIDO" && activePc.status !== "CANCELADO" && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={onCancelar}
                  >
                    Cancelar PC
                  </button>
                )}
              </div>
            </div>

            <h3 className="os-subhead">Itens a comprar</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Qtd</th>
                </tr>
              </thead>
              <tbody>
                {activePc.itens.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <code>{it.produtoCodigo || "—"}</code>
                    </td>
                    <td>{it.descricao}</td>
                    <td>
                      {fmtQtde(it.quantidade)} {it.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {activePc.docsEntrada.length > 0 && (
              <>
                <h3 className="os-subhead">NFes vinculadas</h3>
                <ul className="pc-docs">
                  {activePc.docsEntrada.map((d) => (
                    <li key={d.id}>
                      <span>
                        NFe {d.numero || "—"} · {d.emitenteNome || "Fornecedor"}
                      </span>
                      <span className={docStatusChip(d.status)}>{d.statusLabel}</span>
                      {d.valorTotal != null && (
                        <span className="money">{money(d.valorTotal)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {activePc.status !== "RECEBIDO" && activePc.status !== "CANCELADO" && (
              <div className="compras-receber">
                <h3 className="os-subhead">Receber NFe neste pedido</h3>
                <p className="muted">
                  Gera NFe de homologação com os <strong>itens e quantidades deste PC</strong>.
                  Cada clique cria uma <strong>chave nova</strong> — não reutiliza XML de outro
                  pedido.
                </p>
                <div className="jornada-cta" style={{ marginBottom: "0.75rem" }}>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={onCarregarXml}
                  >
                    Gerar XML fresco (PC #{activePc.numero})
                  </button>
                  <a
                    className="secondary"
                    href={`/api/compras/exemplo-xml?pcId=${encodeURIComponent(activePc.id)}&pc=${activePc.numero}&download=1`}
                  >
                    Baixar XML
                  </a>
                </div>
                <textarea
                  rows={8}
                  value={xml}
                  onChange={(e) => onXmlChange(e.target.value)}
                  placeholder="Cole o XML da NFe de compra ou gere um fresco acima…"
                  className="compras-xml"
                />
                <button
                  type="button"
                  disabled={busy || !xml.trim()}
                  onClick={onImportarXml}
                  style={{ marginTop: "0.65rem" }}
                >
                  Importar NFe neste pedido
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
