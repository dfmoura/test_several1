"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatCurrencyReais, formatDate } from "@/lib/format";
import type { Quote } from "@/lib/types";

export default function OrcamentosPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.quotes
      .list()
      .then((r) => setQuotes(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle="Propostas comerciais com motor de precificação"
        actions={
          <Link href="/orcamentos/novo">
            <Button>Novo orçamento</Button>
          </Link>
        }
      />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {loading ? (
        <LoadingBlock />
      ) : quotes.length === 0 ? (
        <div className="empty-state card card-body">
          Nenhum orçamento ainda.{" "}
          <Link href="/orcamentos/novo" style={{ color: "var(--accent)" }}>
            Criar o primeiro
          </Link>
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
                  <th>Validade</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td>{q.number || q.id.slice(0, 8)}</td>
                    <td>{q.customerName || "—"}</td>
                    <td>
                      <StatusBadge status={q.status} />
                    </td>
                    <td>{formatDate(q.validUntil)}</td>
                    <td>
                      <Link href={`/orcamentos/${q.id}`} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
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
