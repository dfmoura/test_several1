"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import {
  BANCA_DO_DINEI_SPEC,
  DEFAULT_QUANTITIES,
  FINISH_OPTIONS,
  MACHINE_GROUPS,
  PAPER_OPTIONS,
  TUBE_OPTIONS,
} from "@/lib/quote-defaults";
import { formatCurrencyReais } from "@/lib/format";
import type { Customer, QuoteSpec, QuoteTier } from "@/lib/types";

const STEPS = ["Cliente", "Especificação", "Faixas de preço", "Salvar"];

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [spec, setSpec] = useState<QuoteSpec>({ ...BANCA_DO_DINEI_SPEC });
  const [quantities, setQuantities] = useState(DEFAULT_QUANTITIES.join(", "));
  const [tiers, setTiers] = useState<QuoteTier[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.customers
      .list()
      .then((r) => setCustomers(r.data ?? []))
      .catch(() => {});
  }, []);

  function parseQuantities(): number[] {
    return quantities
      .split(/[,;\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
  }

  async function calculate() {
    setCalcLoading(true);
    setError("");
    try {
      const qty = parseQuantities();
      if (qty.length === 0) throw new Error("Informe ao menos uma quantidade");
      const res = await apiClient.pricing.calculate(spec, qty);
      setTiers(res.tiers ?? []);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no cálculo");
    } finally {
      setCalcLoading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("Selecione um cliente");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const quote = await apiClient.quotes.create({
        customerId,
        spec,
        quantities: parseQuantities(),
        notes: notes || undefined,
      });
      router.push(`/orcamentos/${quote.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  function updateSpec<K extends keyof QuoteSpec>(key: K, value: QuoteSpec[K]) {
    setSpec((s) => ({ ...s, [key]: value }));
  }

  return (
    <>
      <PageHeader
        title="Novo orçamento"
        subtitle="Wizard técnico — defaults Banca do Dinei pré-preenchidos"
        actions={
          <Link href="/orcamentos">
            <Button variant="secondary">Voltar</Button>
          </Link>
        }
      />

      <div className="tabs">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`tab ${step === i ? "active" : ""}`}
            onClick={() => i <= step && setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {step === 0 && (
        <div className="card card-body">
          <label className="field">
            <span className="label">Cliente</span>
            <select
              className="select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName || c.legalName}
                </option>
              ))}
            </select>
          </label>
          <div style={{ marginTop: "1rem" }}>
            <Button onClick={() => setStep(1)} disabled={!customerId}>
              Próximo
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card card-body">
          <p style={{ color: "var(--ink-muted)", marginBottom: "1rem" }}>
            Especificação técnica — valores padrão do caso Banca do Dinei (5,0×2,5 · BOPP BRILHO).
          </p>
          <div className="form-grid">
            <label className="field">
              <span className="label">Medida / faca</span>
              <input className="input" value={spec.measureLabel} onChange={(e) => updateSpec("measureLabel", e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Largura papel (cm)</span>
              <input className="input" type="number" step="0.01" value={spec.paperWidthCm} onChange={(e) => updateSpec("paperWidthCm", parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span className="label">Puxada (cm)</span>
              <input className="input" type="number" step="0.00001" value={spec.pullCm} onChange={(e) => updateSpec("pullCm", parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span className="label">Cores</span>
              <input className="input" type="number" min={0} value={spec.colors} onChange={(e) => updateSpec("colors", parseInt(e.target.value, 10))} />
            </label>
            <label className="field">
              <span className="label">Papel</span>
              <select className="select" value={spec.paperName} onChange={(e) => updateSpec("paperName", e.target.value)}>
                {PAPER_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Acabamento</span>
              <select className="select" value={spec.finishName} onChange={(e) => updateSpec("finishName", e.target.value)}>
                {FINISH_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Modelos</span>
              <input className="input" type="number" value={spec.modelsQty} onChange={(e) => updateSpec("modelsQty", parseInt(e.target.value, 10))} />
            </label>
            <label className="field">
              <span className="label">Colunas</span>
              <input className="input" type="number" value={spec.columnsQty} onChange={(e) => updateSpec("columnsQty", parseInt(e.target.value, 10))} />
            </label>
            <label className="field">
              <span className="label">Etiquetas / rolo</span>
              <input className="input" type="number" value={spec.labelsPerRoll} onChange={(e) => updateSpec("labelsPerRoll", parseInt(e.target.value, 10))} />
            </label>
            <label className="field">
              <span className="label">Tubete</span>
              <select className="select" value={spec.tubeSize} onChange={(e) => updateSpec("tubeSize", e.target.value)}>
                {TUBE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Grupo máquina</span>
              <select className="select" value={spec.machineCostGroup} onChange={(e) => updateSpec("machineCostGroup", e.target.value)}>
                {MACHINE_GROUPS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">RPM</span>
              <input className="input" type="number" value={spec.rpm} onChange={(e) => updateSpec("rpm", parseInt(e.target.value, 10))} />
            </label>
            <label className="field">
              <span className="label">Imposto %</span>
              <input className="input" type="number" value={spec.taxPercent} onChange={(e) => updateSpec("taxPercent", parseFloat(e.target.value))} />
            </label>
            <label className="field">
              <span className="label">Comissão %</span>
              <input className="input" type="number" value={spec.commissionPercent} onChange={(e) => updateSpec("commissionPercent", parseFloat(e.target.value))} />
            </label>
          </div>
          <label className="field" style={{ marginTop: "1rem" }}>
            <span className="label">Quantidades (separadas por vírgula)</span>
            <input className="input" value={quantities} onChange={(e) => setQuantities(e.target.value)} />
          </label>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <Button variant="secondary" onClick={() => setStep(0)}>Voltar</Button>
            <Button onClick={calculate} loading={calcLoading}>Calcular faixas</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Quantidade</th>
                  <th>Valor etiqueta</th>
                  <th>Matriz</th>
                  <th>Total</th>
                  <th>m²</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.quantity}>
                    <td>{t.quantity.toLocaleString("pt-BR")}</td>
                    <td>{formatCurrencyReais(t.labelPrice)}</td>
                    <td>{formatCurrencyReais(t.matrixPrice)}</td>
                    <td><strong>{formatCurrencyReais(t.totalPrice)}</strong></td>
                    <td>{t.areaM2?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-body" style={{ borderTop: "1px solid var(--border)" }}>
            <label className="field">
              <span className="label">Observações</span>
              <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)}>Continuar</Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={save} className="card card-body">
          <p>Confirme e salve o orçamento para o cliente selecionado.</p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <Button variant="secondary" type="button" onClick={() => setStep(2)}>Voltar</Button>
            <Button type="submit" loading={loading}>Salvar orçamento</Button>
          </div>
        </form>
      )}
    </>
  );
}
