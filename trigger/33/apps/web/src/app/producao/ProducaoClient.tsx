"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { formatQtde } from "@/lib/orcamento-comercial";

type OpItem = {
  id: string;
  codigo: string;
  status: string;
  statusLabel: string;
  prioridade: number;
  qtdPlanejada: number;
  qtdBoa: number;
  qtdRefugo: number;
  sobraMetros: number | null;
  previstoEm: string | null;
  pedido: {
    id: string;
    codigo: string;
    clienteNome: string;
    status: string;
  };
  item: { descricao: string; quantidade: number } | null;
  os: { id: string; numero: number; status: string } | null;
};

export function ProducaoClient({ name, role }: { name: string; role: string }) {
  const [items, setItems] = useState<OpItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ordens-producao");
    const j = await res.json();
    if (res.ok) setItems(j.items || []);
    else setError(j.error || "Erro ao listar OPs");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(opId: string, action: string, extra?: Record<string, unknown>) {
    setBusy(opId);
    setError(null);
    try {
      const res = await fetch("/api/ordens-producao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opId, action, ...extra }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha na operação");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell name={name} role={role}>
      <PageHeader
        kicker="PCP · Chão de fábrica"
        title="Produção"
        subtitle="Ordens de produção (OP) vinculadas aos pedidos liberados."
        actions={
          <Link className="btn secondary-link" href="/pedidos">
            ← Pedidos
          </Link>
        }
      />

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>OP</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Item</th>
              <th>Status</th>
              <th>Qtd</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((op) => (
              <tr key={op.id}>
                <td>
                  <strong>{op.codigo}</strong>
                  {op.os && (
                    <span className="muted" style={{ display: "block", fontSize: "0.8rem" }}>
                      OS {op.os.numero}
                    </span>
                  )}
                </td>
                <td>
                  <Link href={`/pedidos/${op.pedido.id}`}>{op.pedido.codigo}</Link>
                </td>
                <td>{op.pedido.clienteNome}</td>
                <td>{op.item?.descricao ?? "—"}</td>
                <td>
                  <span className="chip">{op.statusLabel}</span>
                </td>
                <td>
                  {formatQtde(op.qtdBoa || 0)} / {formatQtde(op.qtdPlanejada)}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {["PLANEJADA", "EMPENHADA", "EM_SETUP"].includes(op.status) && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy === op.id}
                      onClick={() => void action(op.id, "iniciar")}
                    >
                      Iniciar
                    </button>
                  )}
                  {op.status === "EM_PRODUCAO" && (
                    <>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy === op.id}
                        onClick={() =>
                          void action(op.id, "apontar", {
                            qtdBoa: op.qtdPlanejada,
                          })
                        }
                      >
                        Apontar
                      </button>{" "}
                      <button
                        type="button"
                        disabled={busy === op.id}
                        onClick={() =>
                          void action(op.id, "concluir", {
                            qtdBoa: op.qtdPlanejada,
                          })
                        }
                      >
                        Concluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7} className="muted">
                  Nenhuma OP na fila. Confirme pedidos liberados para gerar ordens de produção.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
