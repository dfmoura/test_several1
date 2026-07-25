import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const recent = await prisma.orcamento.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      numero: true,
      versao: true,
      status: true,
      clienteNome: true,
      vendedorNome: true,
      createdAt: true,
    },
  });

  return (
    <div className="shell">
      <AppHeader name={session.name} role={session.role} />

      <section className="card-panel">
        <h1>Painel</h1>
        <p className="muted">
          Motor de cálculo alinhado à planilha oficial. Crie propostas comparando
          várias quantidades com breakdown técnico e consolidado comercial.
        </p>
        <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
          <Link className="btn" href="/orcamentos/novo">
            Novo orçamento
          </Link>
        </div>
      </section>

      <section className="card-panel" style={{ marginTop: "1.25rem" }}>
        <h2>Recentes</h2>
        {recent.length === 0 ? (
          <p className="muted">Nenhum orçamento ainda.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orcamentos/${o.id}`}>
                      {o.numero}-v{o.versao}
                    </Link>
                  </td>
                  <td>{o.clienteNome}</td>
                  <td>{o.vendedorNome}</td>
                  <td>{o.status}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
