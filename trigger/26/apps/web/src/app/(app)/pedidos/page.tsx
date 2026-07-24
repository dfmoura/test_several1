"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SalesOrder } from "@/lib/types";

export default function PedidosPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.orders
      .list()
      .then((r) => setOrders(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Pedidos de venda a partir de orçamentos aprovados" />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {loading ? (
        <LoadingBlock />
      ) : orders.length === 0 ? (
        <div className="empty-state card card-body">
          Nenhum pedido. Aprove um orçamento e crie o pedido na tela de detalhe.
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Criado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.number || o.id.slice(0, 8)}</td>
                    <td>{o.customerName || "—"}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{formatCurrency(o.totalCents)}</td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>
                      <Link href={`/pedidos/${o.id}`} className="btn btn-ghost btn-sm">Abrir</Link>
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
