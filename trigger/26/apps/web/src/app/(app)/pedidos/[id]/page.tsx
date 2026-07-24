"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCurrencyReais, formatDate } from "@/lib/format";
import type { SalesOrder } from "@/lib/types";

export default function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [billing, setBilling] = useState(false);

  function load() {
    setLoading(true);
    apiClient.orders
      .get(id)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function faturar() {
    setBilling(true);
    setError("");
    try {
      await apiClient.billing.createFromOrder(id, true);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao faturar");
    } finally {
      setBilling(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (!order) return <ErrorAlert message={error || "Pedido não encontrado"} />;

  const canBill = !["faturado", "entregue", "encerrado", "cancelado"].includes(order.status);

  return (
    <>
      <PageHeader
        title={order.number || `Pedido ${id.slice(0, 8)}`}
        subtitle={order.customerName || "Cliente"}
        actions={
          <Link href="/pedidos">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />

      {error && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorAlert message={error} />
        </div>
      )}

      <div className="card card-body" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <span className="label">Status</span>
            <div>
              <StatusBadge status={order.status} />
            </div>
          </div>
          <div>
            <span className="label">Pagamento</span>
            <div>{order.paymentTerms || "—"}</div>
          </div>
          <div>
            <span className="label">Criado em</span>
            <div>{formatDate(order.createdAt)}</div>
          </div>
        </div>
      </div>

      {order.lines && order.lines.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.description || "—"}</td>
                    <td>{Number(line.quantity).toLocaleString("pt-BR")}</td>
                    <td>{formatCurrencyReais(Number((line as { unitPrice?: number }).unitPrice ?? line.unitPriceCents ?? 0))}</td>
                    <td>
                      {formatCurrencyReais(
                        Number((line as { lineTotal?: number }).lineTotal ?? line.totalCents ?? 0),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {canBill && (
          <Button loading={billing} onClick={faturar}>
            Gerar fatura
          </Button>
        )}
        <Link href="/ordens">
          <Button variant="secondary">Ver ordens de serviço</Button>
        </Link>
        <Link href="/faturamento">
          <Button variant="secondary">Faturamento</Button>
        </Link>
      </div>
    </>
  );
}
