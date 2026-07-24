"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCurrencyReais, formatDate } from "@/lib/format";
import type { Quote } from "@/lib/types";

export default function OrcamentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [selectedQty, setSelectedQty] = useState<number | "">("");

  function load() {
    setLoading(true);
    apiClient.quotes
      .get(id)
      .then((q) => {
        setQuote(q);
        if (q.selectedQuantity) setSelectedQty(q.selectedQuantity);
        else if (q.tiers?.length) setSelectedQty(q.tiers[0].quantity);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus(status: string) {
    setActionLoading(status);
    setError("");
    try {
      const qty = typeof selectedQty === "number" ? selectedQty : undefined;
      const updated = await apiClient.quotes.updateStatus(id, status, qty);
      setQuote(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setActionLoading("");
    }
  }

  async function createOrder() {
    setActionLoading("order");
    setError("");
    try {
      const order = await apiClient.orders.fromQuote(
        id,
        typeof selectedQty === "number" ? selectedQty : undefined,
      );
      router.push(`/pedidos/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar pedido");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) return <LoadingBlock />;
  if (!quote) return <ErrorAlert message={error || "Orçamento não encontrado"} />;

  const canSend = quote.status === "rascunho";
  const canApprove = quote.status === "enviado" || quote.status === "rascunho";
  const canReject = ["rascunho", "enviado"].includes(quote.status);
  const isApproved = quote.status === "aprovado";

  return (
    <>
      <PageHeader
        title={quote.number || `Orçamento ${id.slice(0, 8)}`}
        subtitle={quote.customerName || "Cliente"}
        actions={
          <Link href="/orcamentos">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        <div className="card card-body">
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <span>Status:</span>
            <StatusBadge status={quote.status} />
          </div>
          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Validade: {formatDate(quote.validUntil)}
          </p>
        </div>
        <div className="card card-body">
          <label className="field">
            <span className="label">Quantidade aprovada</span>
            <select
              className="select"
              value={selectedQty}
              onChange={(e) => setSelectedQty(parseInt(e.target.value, 10))}
            >
              {(quote.tiers ?? []).map((t) => (
                <option key={t.quantity} value={t.quantity}>
                  {t.quantity.toLocaleString("pt-BR")} — {formatCurrencyReais(t.totalPrice)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {canSend && (
          <Button loading={actionLoading === "enviado"} onClick={() => updateStatus("enviado")}>
            Enviar ao cliente
          </Button>
        )}
        {canApprove && (
          <Button loading={actionLoading === "aprovado"} onClick={() => updateStatus("aprovado")}>
            Aprovar
          </Button>
        )}
        {canReject && (
          <Button variant="danger" loading={actionLoading === "reprovado"} onClick={() => updateStatus("reprovado")}>
            Reprovar
          </Button>
        )}
        {isApproved && (
          <Button variant="secondary" loading={actionLoading === "order"} onClick={createOrder}>
            Criar pedido
          </Button>
        )}
      </div>

      {quote.spec && (
        <div className="card card-body" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>Especificação técnica</h2>
          <div className="form-grid">
            <div><span className="label">Medida</span><div>{quote.spec.measureLabel}</div></div>
            <div><span className="label">Papel</span><div>{quote.spec.paperName}</div></div>
            <div><span className="label">Acabamento</span><div>{quote.spec.finishName}</div></div>
            <div><span className="label">Cores</span><div>{quote.spec.colors}</div></div>
            <div><span className="label">Máquina</span><div>{quote.spec.machineCostGroup}</div></div>
            <div><span className="label">Tubete</span><div>{quote.spec.tubeSize}</div></div>
          </div>
        </div>
      )}

      {quote.tiers && quote.tiers.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Qtd</th>
                  <th>Etiqueta</th>
                  <th>Matriz</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.tiers.map((t) => (
                  <tr key={t.quantity}>
                    <td>{t.quantity.toLocaleString("pt-BR")}</td>
                    <td>{formatCurrencyReais(t.labelPrice)}</td>
                    <td>{formatCurrencyReais(t.matrixPrice)}</td>
                    <td><strong>{formatCurrencyReais(t.totalPrice)}</strong></td>
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
