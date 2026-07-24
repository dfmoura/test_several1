"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payable, Receivable } from "@/lib/types";

export default function FinanceiroPage() {
  const [tab, setTab] = useState<"ar" | "ap">("ar");
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [allocating, setAllocating] = useState(false);

  const [form, setForm] = useState({
    id: "",
    amountReais: "",
    notes: "",
  });

  function load() {
    setLoading(true);
    setError("");
    Promise.all([
      apiClient.finance.receivables().then((r) => setReceivables(r.data ?? [])),
      apiClient.finance.payables().then((r) => setPayables(r.data ?? [])),
    ])
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function onAllocate(e: FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(form.amountReais.replace(",", ".")) * 100);
    if (!form.id || Number.isNaN(amountCents) || amountCents <= 0) {
      setError("Informe título e valor válidos");
      return;
    }
    setAllocating(true);
    setError("");
    setSuccess("");
    try {
      await apiClient.finance.allocate({
        receivableId: tab === "ar" ? form.id : undefined,
        payableId: tab === "ap" ? form.id : undefined,
        amountCents,
        notes: form.notes || undefined,
      });
      setSuccess("Baixa registrada com sucesso");
      setForm({ id: "", amountReais: "", notes: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na baixa");
    } finally {
      setAllocating(false);
    }
  }

  const titles = tab === "ar" ? receivables : payables;

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Contas a receber e a pagar — baixa manual" />

      <div className="tabs">
        <button type="button" className={`tab ${tab === "ar" ? "active" : ""}`} onClick={() => setTab("ar")}>
          A receber
        </button>
        <button type="button" className={`tab ${tab === "ap" ? "active" : ""}`} onClick={() => setTab("ap")}>
          A pagar
        </button>
      </div>

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}
      {success && (
        <div className="alert alert-info" style={{ marginBottom: "1rem" }}>{success}</div>
      )}

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div>
          {loading ? (
            <LoadingBlock />
          ) : titles.length === 0 ? (
            <div className="empty-state card card-body">Nenhum título.</div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>{tab === "ar" ? "Cliente" : "Fornecedor"}</th>
                      <th>Vencimento</th>
                      <th>Saldo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titles.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setForm((f) => ({ ...f, id: t.id, amountReais: (t.balanceCents / 100).toFixed(2) }))}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{t.number || t.id.slice(0, 8)}</td>
                        <td>{"customerName" in t ? t.customerName : (t as Payable).supplierName}</td>
                        <td>{formatDate(t.dueDate)}</td>
                        <td>{formatCurrency(t.balanceCents)}</td>
                        <td><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="card card-body">
          <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Baixa manual</h2>
          <form onSubmit={onAllocate}>
            <label className="field">
              <span className="label">Título selecionado</span>
              <input className="input" value={form.id} readOnly placeholder="Clique em um título na lista" />
            </label>
            <label className="field">
              <span className="label">Valor (R$)</span>
              <input
                className="input"
                value={form.amountReais}
                onChange={(e) => setForm({ ...form, amountReais: e.target.value })}
                placeholder="0,00"
              />
            </label>
            <label className="field">
              <span className="label">Observações</span>
              <textarea
                className="textarea"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <Button type="submit" loading={allocating} style={{ marginTop: "0.5rem" }}>
              Registrar baixa
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
