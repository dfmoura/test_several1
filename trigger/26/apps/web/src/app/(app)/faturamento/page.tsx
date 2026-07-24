"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCurrencyReais } from "@/lib/format";
import type { BillableOrder, Invoice } from "@/lib/types";

function money(value: number | string | undefined | null): string {
  return formatCurrencyReais(Number(value ?? 0));
}

export default function FaturamentoPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billable, setBillable] = useState<BillableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [inv, orders] = await Promise.all([
        apiClient.billing.list(),
        apiClient.billing.billableOrders(),
      ]);
      setInvoices(inv.data ?? []);
      setBillable(orders.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar faturamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createInvoice(orderId: string) {
    setActionKey(`create-${orderId}`);
    setError("");
    try {
      await apiClient.billing.createFromOrder(orderId, true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar fatura");
    } finally {
      setActionKey("");
    }
  }

  async function emitNfe(id: string) {
    setActionKey(`${id}-nfe`);
    setError("");
    try {
      await apiClient.billing.emitNfe(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro NF-e");
    } finally {
      setActionKey("");
    }
  }

  async function emitCharge(id: string) {
    setActionKey(`${id}-charge`);
    setError("");
    try {
      await apiClient.billing.emitCharge(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro cobrança");
    } finally {
      setActionKey("");
    }
  }

  return (
    <>
      <PageHeader
        title="Faturamento"
        subtitle="Gere fatura a partir do pedido, depois NF-e e cobrança Inter (fake no local)"
      />

      {error && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", marginBottom: "0.75rem" }}>
              Pedidos prontos para faturar
            </h2>
            {billable.length === 0 ? (
              <div className="empty-state card card-body">
                Nenhum pedido pendente de fatura.{" "}
                <Link href="/ordens">Conclua a OS</Link> e volte aqui.
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Status</th>
                        <th>OS</th>
                        <th>Total</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billable.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <Link href={`/pedidos/${o.id}`}>{o.number || o.id.slice(0, 8)}</Link>
                          </td>
                          <td>{o.customerName || "—"}</td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                          <td>
                            {Number(o.woDone ?? 0)}/{Number(o.woTotal ?? 0)}
                            {o.ready ? " · pronta" : " · incompleta"}
                          </td>
                          <td>{money(o.totalAmount)}</td>
                          <td>
                            <Button
                              size="sm"
                              loading={actionKey === `create-${o.id}`}
                              onClick={() => createInvoice(o.id)}
                              title={
                                o.ready
                                  ? "Gerar fatura"
                                  : "OS incompleta — admin pode forçar (override)"
                              }
                            >
                              Gerar fatura
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", marginBottom: "0.75rem" }}>
              Faturas
            </h2>
            {invoices.length === 0 ? (
              <div className="empty-state card card-body">
                Nenhuma fatura ainda. Use <strong>Gerar fatura</strong> acima.
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fatura</th>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th>NF-e</th>
                        <th>Cobrança</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const fiscalOk = inv.fiscalStatus === "autorizada";
                        const chargeOk =
                          inv.chargeStatus === "emitida" ||
                          inv.chargeStatus === "paga" ||
                          inv.chargeStatus === "baixa_manual";
                        return (
                          <tr key={inv.id}>
                            <td>{inv.number || inv.id.slice(0, 8)}</td>
                            <td>{inv.orderNumber || "—"}</td>
                            <td>{inv.customerName || "—"}</td>
                            <td>
                              <StatusBadge status={inv.status} />
                            </td>
                            <td>{money(inv.totalAmount ?? inv.totalCents)}</td>
                            <td>{inv.fiscalStatus || "—"}</td>
                            <td>{inv.chargeStatus || "—"}</td>
                            <td>
                              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                {!fiscalOk && (
                                  <Button
                                    size="sm"
                                    loading={actionKey === `${inv.id}-nfe`}
                                    onClick={() => emitNfe(inv.id)}
                                  >
                                    Emitir NF-e
                                  </Button>
                                )}
                                {!chargeOk && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    loading={actionKey === `${inv.id}-charge`}
                                    onClick={() => emitCharge(inv.id)}
                                  >
                                    Cobrança
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
