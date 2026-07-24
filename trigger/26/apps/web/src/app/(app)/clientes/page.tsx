"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCnpj, onlyDigits } from "@/lib/format";
import type { Customer } from "@/lib/types";

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [form, setForm] = useState({
    document: "",
    legalName: "",
    tradeName: "",
    email: "",
    phone: "",
    defaultPaymentTerms: "28",
  });

  function load() {
    setLoading(true);
    apiClient.customers
      .list()
      .then((r) => setCustomers(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function lookupCnpj() {
    const cnpj = onlyDigits(form.document);
    if (cnpj.length !== 14) {
      setError("Informe um CNPJ válido (14 dígitos)");
      return;
    }
    setLookupLoading(true);
    setError("");
    try {
      const data = await apiClient.customers.lookupCnpj(cnpj);
      setForm((f) => ({
        ...f,
        document: cnpj,
        legalName: data.legalName || f.legalName,
        tradeName: data.tradeName || f.tradeName,
        email: data.email || f.email,
        phone: data.phone || f.phone,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Consulta CNPJ falhou");
    } finally {
      setLookupLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiClient.customers.create({
        document: onlyDigits(form.document),
        legalName: form.legalName,
        tradeName: form.tradeName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        defaultPaymentTerms: form.defaultPaymentTerms,
      });
      setShowForm(false);
      setForm({
        document: "",
        legalName: "",
        tradeName: "",
        email: "",
        phone: "",
        defaultPaymentTerms: "28",
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes com consulta CNPJ"
        actions={
          <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Fechar formulário" : "Novo cliente"}
          </Button>
        }
      />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-body">
            <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Novo cliente</h2>
            <form onSubmit={onSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span className="label">CNPJ</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      className="input"
                      value={form.document}
                      onChange={(e) => setForm({ ...form, document: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                    <Button type="button" variant="secondary" onClick={lookupCnpj} loading={lookupLoading}>
                      Consultar
                    </Button>
                  </div>
                </label>
                <label className="field">
                  <span className="label">Razão social</span>
                  <input
                    className="input"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span className="label">Nome fantasia</span>
                  <input
                    className="input"
                    value={form.tradeName}
                    onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="label">E-mail</span>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="label">Telefone</span>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="label">Condição pagamento</span>
                  <input
                    className="input"
                    value={form.defaultPaymentTerms}
                    onChange={(e) => setForm({ ...form, defaultPaymentTerms: e.target.value })}
                  />
                </label>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <Button type="submit" loading={saving}>
                  Salvar cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingBlock />
      ) : customers.length === 0 ? (
        <div className="empty-state card card-body">Nenhum cliente cadastrado.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Razão social</th>
                  <th>CNPJ</th>
                  <th>E-mail</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.tradeName || c.legalName}</strong>
                      {c.tradeName && (
                        <div style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>{c.legalName}</div>
                      )}
                    </td>
                    <td>{c.document ? formatCnpj(c.document) : "—"}</td>
                    <td>{c.email || "—"}</td>
                    <td>{c.defaultPaymentTerms || "—"}</td>
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
