"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PurchaseOrder } from "@/lib/types";

export default function ComprasPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receivingId, setReceivingId] = useState("");

  function load() {
    setLoading(true);
    apiClient.purchasing
      .list()
      .then((r) => setOrders(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function receive(id: string) {
    setReceivingId(id);
    setError("");
    try {
      await apiClient.purchasing.receive(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no recebimento");
    } finally {
      setReceivingId("");
    }
  }

  return (
    <>
      <PageHeader title="Compras" subtitle="Pedidos de compra e recebimento de insumos" />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {loading ? (
        <LoadingBlock />
      ) : orders.length === 0 ? (
        <div className="empty-state card card-body">Nenhum pedido de compra.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fornecedor</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Previsão</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id}>
                    <td>{po.number || po.id.slice(0, 8)}</td>
                    <td>{po.supplierName || "—"}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>{formatCurrency(po.totalCents)}</td>
                    <td>{formatDate(po.expectedAt)}</td>
                    <td>
                      {po.status !== "recebido" && (
                        <Button size="sm" loading={receivingId === po.id} onClick={() => receive(po.id)}>
                          Receber
                        </Button>
                      )}
                    </td>
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
