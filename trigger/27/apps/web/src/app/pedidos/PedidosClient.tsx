"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { formatBrl } from "@/lib/orcamento-comercial";

type PedidoListItem = {
  id: string;
  numero: number;
  status: string;
  statusLabel: string;
  clienteNome: string;
  quantidade: number;
  valorTotal: number;
  createdAt: string;
  ordensServico: Array<{ numero: number; status: string; statusLabel: string }>;
  docSaida: { status: string; numero: string | null; simulado: boolean } | null;
  docsSaida?: Array<{ status: string; numero: string | null; simulado: boolean; tipo?: string }>;
  tituloReceber: { status: string; valor: number } | null;
};

export function PedidosClient({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [items, setItems] = useState<PedidoListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pedidos");
    const j = await res.json();
    if (res.ok) setItems(j.items || []);
    else setError(j.error || "Erro ao listar");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="shell">
      <AppHeader name={name} role={role} />
      <p className="jornada-kicker">4–8 · Operação</p>
      <h1>Pedidos</h1>
      <p className="muted">
        Jornada: pedido/OS → materiais → produção → notas fiscais → boleto → entrega →
        recebimento. Abra um pedido para avançar a etapa atual.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap" style={{ marginTop: "1rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>OS</th>
              <th>Status</th>
              <th>Fiscal</th>
              <th>Financeiro</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const os = p.ordensServico[0];
              return (
                <tr
                  key={p.id}
                  className="pedido-row"
                  onClick={() => router.push(`/pedidos/${p.id}`)}
                >
                  <td>
                    <strong>{p.numero}</strong>
                  </td>
                  <td>{p.clienteNome}</td>
                  <td>
                    {os ? (
                      <span className="chip">
                        OS {os.numero} · {os.statusLabel}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="chip">{p.statusLabel}</span>
                  </td>
                  <td>
                    {p.docsSaida?.length || p.docSaida ? (
                      <span className="muted">
                        {(p.docsSaida || [p.docSaida!])
                          .filter(Boolean)
                          .map((d) => `${(d as { tipo?: string }).tipo || "NF"} ${d!.numero}`)
                          .join(" · ")}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {p.tituloReceber ? (
                      <span className="muted">{p.tituloReceber.status}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="money">{formatBrl(p.valorTotal)}</td>
                  <td>
                    <Link
                      href={`/pedidos/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver jornada →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td colSpan={8} className="muted">
                  Nenhum pedido — aprove um orçamento e use <em>Gerar pedido</em>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
