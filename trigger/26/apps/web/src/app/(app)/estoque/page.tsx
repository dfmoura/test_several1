"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { StockBalance, StockMovement } from "@/lib/types";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(value: unknown): string {
  return num(value).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

export default function EstoquePage() {
  const [tab, setTab] = useState<"balances" | "movements">("balances");
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const req =
      tab === "balances"
        ? apiClient.inventory.balances().then((r) => setBalances(r.data ?? []))
        : apiClient.inventory.movements().then((r) => setMovements(r.data ?? []));
    req
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <>
      <PageHeader title="Estoque" subtitle="Saldos e movimentações de insumos" />

      <div className="tabs">
        <button type="button" className={`tab ${tab === "balances" ? "active" : ""}`} onClick={() => setTab("balances")}>
          Saldos
        </button>
        <button type="button" className={`tab ${tab === "movements" ? "active" : ""}`} onClick={() => setTab("movements")}>
          Movimentos
        </button>
      </div>

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {loading ? (
        <LoadingBlock />
      ) : tab === "balances" ? (
        balances.length === 0 ? (
          <div className="empty-state card card-body">Sem saldos registrados.</div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>Depósito</th>
                    <th>Disponível</th>
                    <th>Reservado</th>
                    <th>UoM</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => {
                    const available = num(b.quantity ?? b.qtyAvailable ?? b.qtyOnHand);
                    const reserved = num(b.qtyReserved);
                    const critical = b.isCritical ?? available <= 0;
                    const rowKey = b.id ?? `${b.itemId}-${b.warehouseCode ?? b.warehouseName}`;
                    return (
                      <tr key={rowKey} style={critical ? { background: "var(--danger-soft)" } : undefined}>
                        <td><strong>{b.itemName || b.name || "—"}</strong></td>
                        <td>{b.sku || "—"}</td>
                        <td>{b.warehouseName || b.warehouseCode || "—"}</td>
                        <td>{formatQty(available)}</td>
                        <td>{formatQty(reserved)}</td>
                        <td>{b.uomCode || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : movements.length === 0 ? (
        <div className="empty-state card card-body">Sem movimentações.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Item</th>
                  <th>Tipo</th>
                  <th>Qtd</th>
                  <th>Ref.</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.createdAt ?? m.movedAt)}</td>
                    <td>{m.itemName || m.name || "—"}</td>
                    <td>{m.movementType || "—"}</td>
                    <td>{formatQty(m.quantity ?? m.qty)}</td>
                    <td>{m.reference || m.refType || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
