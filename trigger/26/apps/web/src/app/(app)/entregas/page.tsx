"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert, LoadingBlock } from "@/components/ui/Feedback";
import { apiClient } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Shipment } from "@/lib/types";

export default function EntregasPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");

  function load() {
    setLoading(true);
    apiClient.shipments
      .list()
      .then((r) => setShipments(r.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function advance(id: string, status: string) {
    setActionId(`${id}-${status}`);
    setError("");
    try {
      await apiClient.shipments.advance(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setActionId("");
    }
  }

  async function confirm(id: string) {
    setActionId(`${id}-confirm`);
    setError("");
    try {
      await apiClient.shipments.confirm(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setActionId("");
    }
  }

  return (
    <>
      <PageHeader title="Entregas" subtitle="Remessas e confirmação de entrega" />

      {error && <div style={{ marginBottom: "1rem" }}><ErrorAlert message={error} /></div>}

      {loading ? (
        <LoadingBlock />
      ) : shipments.length === 0 ? (
        <div className="empty-state card card-body">Nenhuma remessa registrada.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Remessa</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Transportadora</th>
                  <th>Rastreio</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td>{s.number || s.id.slice(0, 8)}</td>
                    <td>{s.orderNumber || "—"}</td>
                    <td>{s.customerName || "—"}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>{s.carrier || "—"}</td>
                    <td>{s.trackingCode || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {s.status === "aguardando" && (
                          <Button
                            size="sm"
                            loading={actionId === `${s.id}-expedida`}
                            onClick={() => advance(s.id, "expedida")}
                          >
                            Expedir
                          </Button>
                        )}
                        {s.status === "expedida" && (
                          <Button
                            size="sm"
                            loading={actionId === `${s.id}-em_transito`}
                            onClick={() => advance(s.id, "em_transito")}
                          >
                            Em trânsito
                          </Button>
                        )}
                        {["expedida", "em_transito"].includes(s.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={actionId === `${s.id}-confirm`}
                            onClick={() => confirm(s.id)}
                          >
                            Confirmar entrega
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
