"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { WorkOrder } from "@/lib/types";

export default function OrdensPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");

  function load() {
    setLoading(true);
    apiClient.workOrders
      .list()
      .then((r) => setOrders(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function action(id: string, type: "liberar" | "iniciar" | "concluir") {
    setActionId(`${id}-${type}`);
    setError("");
    try {
      if (type === "liberar") await apiClient.workOrders.liberar(id);
      else if (type === "iniciar") await apiClient.workOrders.iniciar(id);
      else await apiClient.workOrders.concluir(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na ação");
    } finally {
      setActionId("");
    }
  }

  return (
    <>
      <PageHeader
        title="Ordens de serviço"
        subtitle="Produção — liberar, iniciar e concluir OS"
      />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {loading ? (
        <LoadingBlock />
      ) : orders.length === 0 ? (
        <div className="empty-state card card-body">Nenhuma ordem de serviço.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>OS</th>
                  <th>Pedido</th>
                  <th>Máquina</th>
                  <th>Status</th>
                  <th>Agendada</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((wo) => (
                  <tr key={wo.id}>
                    <td>{wo.number || wo.id.slice(0, 8)}</td>
                    <td>{wo.orderNumber || "—"}</td>
                    <td>{wo.machineName || "—"}</td>
                    <td><StatusBadge status={wo.status} /></td>
                    <td>{formatDateTime(wo.scheduledAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {wo.status === "planejada" && (
                          <Button
                            size="sm"
                            loading={actionId === `${wo.id}-liberar`}
                            onClick={() => action(wo.id, "liberar")}
                          >
                            Liberar
                          </Button>
                        )}
                        {wo.status === "liberada" && (
                          <Button
                            size="sm"
                            loading={actionId === `${wo.id}-iniciar`}
                            onClick={() => action(wo.id, "iniciar")}
                          >
                            Iniciar
                          </Button>
                        )}
                        {wo.status === "em_execucao" && (
                          <Button
                            size="sm"
                            loading={actionId === `${wo.id}-concluir`}
                            onClick={() => action(wo.id, "concluir")}
                          >
                            Concluir
                          </Button>
                        )}
                      </div>
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
