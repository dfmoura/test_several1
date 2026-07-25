import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function OrcamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const o = await prisma.orcamento.findUnique({ where: { id } });
  if (!o) notFound();

  const input = o.inputSnapshot as Record<string, unknown>;
  const result = o.resultSnapshot as {
    faixas?: Array<{
      production: { quantidade: number; qtdeRolos: number };
      commercial: { valorEtiqueta: number; valorMatriz: number; valorTotal: number };
      costs: { valorServico: number };
    }>;
  } | null;

  return (
    <div className="shell">
      <AppHeader name={session.name} role={session.role} />
      <p>
        <Link href="/orcamentos">← Voltar</Link>
      </p>
      <h1>
        Orçamento {o.numero}-v{o.versao}
      </h1>
      <p className="muted">
        {o.clienteNome} · {o.vendedorNome} · {o.status}
      </p>

      <section className="card-panel" style={{ marginTop: "1rem" }}>
        <h2>Consolidado comercial</h2>
        <p className="muted">
          {String(input.papel || "")} · {String(input.medida || "")} ·{" "}
          {String(input.acabamento || "")} · {String(input.etiqPorRolo || "")} etiq/rolo
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Etiquetas</th>
              <th>Rolos</th>
              <th>Total</th>
              <th>Unitário</th>
              <th>Valor rolo</th>
              <th>Matriz</th>
              <th>Total c/ matriz</th>
            </tr>
          </thead>
          <tbody>
            {(result?.faixas || []).map((f) => (
              <tr key={f.production.quantidade}>
                <td>{f.production.quantidade.toLocaleString("pt-BR")}</td>
                <td>{f.production.qtdeRolos}</td>
                <td>{brl(f.commercial.valorEtiqueta)}</td>
                <td>{brl(f.commercial.valorEtiqueta / f.production.quantidade)}</td>
                <td>{brl(f.commercial.valorEtiqueta / f.production.qtdeRolos)}</td>
                <td>{brl(f.commercial.valorMatriz)}</td>
                <td>
                  <strong>{brl(f.commercial.valorTotal)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Prazo: 12 dias úteis · Validade: 7 dias · Quantidades podem variar ±20%
          <br />
          Matriz — somente no 1º pedido. Breakdown de custo interno não é exibido ao cliente.
        </p>
      </section>

      {session.role !== "VENDEDOR" && (
        <section className="card-panel" style={{ marginTop: "1rem" }}>
          <h2>Breakdown interno</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Qtde</th>
                <th>Valor serviço</th>
              </tr>
            </thead>
            <tbody>
              {(result?.faixas || []).map((f) => (
                <tr key={f.production.quantidade}>
                  <td>{f.production.quantidade.toLocaleString("pt-BR")}</td>
                  <td>{brl(f.costs.valorServico)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
