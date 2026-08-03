"use client";

import Link from "next/link";
import {
  fmtQtde,
  necStatusChip,
  type Nec,
} from "./compras-types";

export function NecessidadesTab({
  necs,
  necsAbertas,
  necsEmCompra,
  selectedNec,
  busy,
  onToggle,
  onSelectAll,
  onCriarPc,
  onGoPedidos,
  onOpenPc,
}: {
  necs: Nec[];
  necsAbertas: Nec[];
  necsEmCompra: Nec[];
  selectedNec: Set<string>;
  busy: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onCriarPc: () => void;
  onGoPedidos: () => void;
  onOpenPc: (pcId: string) => void;
}) {
  return (
    <section className="card-panel jornada-section">
      <div className="jornada-section-head">
        <h2>Necessidades de material</h2>
        <div className="jornada-cta">
          {necsAbertas.length > 0 && (
            <button type="button" className="secondary" onClick={onSelectAll}>
              Selecionar abertas ({necsAbertas.length})
            </button>
          )}
          <button
            type="button"
            disabled={busy || !selectedNec.size}
            onClick={onCriarPc}
          >
            Gerar pedido de compra
            {selectedNec.size > 0 ? ` (${selectedNec.size})` : ""}
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Selecione linhas de vários pedidos de venda. Produtos iguais são consolidados em
        uma linha no pedido de compra.
      </p>

      {necsEmCompra.length > 0 && (
        <p className="compras-hint">
          {necsEmCompra.length} necessidade(s) já em compra — veja em{" "}
          <button type="button" className="linkish" onClick={onGoPedidos}>
            Pedidos de compra
          </button>
          .
        </p>
      )}

      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Insumo</th>
            <th>Pedido venda</th>
            <th>Qtd</th>
            <th>Status</th>
            <th>PC</th>
          </tr>
        </thead>
        <tbody>
          {necs.map((n) => (
            <tr key={n.id} className={n.status === "EM_COMPRA" ? "row-muted" : ""}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedNec.has(n.id)}
                  onChange={() => onToggle(n.id)}
                  disabled={n.status !== "ABERTA"}
                  aria-label={`Selecionar ${n.descricao}`}
                />
              </td>
              <td>
                <strong>{n.descricao}</strong>
                {n.produtoCodigo && (
                  <div className="muted">
                    <code>{n.produtoCodigo}</code>
                  </div>
                )}
              </td>
              <td>
                {n.pedidoNumero != null ? (
                  <>
                    {n.pedidoVendaId ? (
                      <Link href={`/pedidos/${n.pedidoVendaId}`}>
                        <strong>#{n.pedidoNumero}</strong>
                      </Link>
                    ) : (
                      <strong>#{n.pedidoNumero}</strong>
                    )}
                    {n.pedidoCliente && (
                      <div className="muted">{n.pedidoCliente}</div>
                    )}
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>
                {fmtQtde(n.quantidade)} {n.unidade}
              </td>
              <td>
                <span className={necStatusChip(n.status)}>
                  {n.statusLabel || n.status}
                </span>
              </td>
              <td>
                {n.pedidoCompraNumero != null ? (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      if (n.pedidoCompraId) onOpenPc(n.pedidoCompraId);
                    }}
                  >
                    PC #{n.pedidoCompraNumero}
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
          {!necs.length && (
            <tr>
              <td colSpan={6} className="muted">
                Sem necessidades abertas ou em compra. Compre insumos ou confirme um
                pedido com falta de material.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
