import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ListaOrcamentosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await prisma.orcamento.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="shell">
      <AppHeader name={session.name} role={session.role} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Orçamentos</h1>
        <Link className="btn" href="/orcamentos/novo">
          Novo
        </Link>
      </div>
      <section className="card-panel" style={{ marginTop: "1rem" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Status</th>
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/orcamentos/${o.id}`}>
                    {o.numero}-v{o.versao}
                  </Link>
                </td>
                <td>{o.clienteNome}</td>
                <td>{o.vendedorNome}</td>
                <td>{o.status}</td>
                <td>{new Date(o.updatedAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
