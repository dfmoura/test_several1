import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isOrcamentoMutavel,
  STATUS_CHIP_CLASS,
  STATUS_LABEL,
} from "@/lib/orcamento-status";

export default async function ListaOrcamentosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await prisma.orcamento.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AppShell name={session.name} role={session.role}>
      <PageHeader
        kicker="3 · Comercial"
        title="Orçamentos"
        subtitle="Pendentes podem ser editados ou excluídos até a aprovação/reprovação."
        actions={
          <Link className="btn" href="/orcamentos/novo">
            Novo orçamento
          </Link>
        }
      />
      <section className="card-panel">
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Status</th>
              <th>Atualizado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const mutavel = isOrcamentoMutavel(o.status);
              return (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orcamentos/${o.id}`}>
                      {o.numero}-v{o.versao}
                    </Link>
                  </td>
                  <td>{o.clienteNome}</td>
                  <td>{o.vendedorNome}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td>{new Date(o.updatedAt).toLocaleString("pt-BR")}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link href={`/orcamentos/${o.id}`}>Abrir</Link>
                    {mutavel && (
                      <>
                        {" · "}
                        <Link href={`/orcamentos/${o.id}/editar`}>Editar</Link>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhum orçamento ainda.{" "}
                  <Link href="/orcamentos/novo">Criar o primeiro</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
