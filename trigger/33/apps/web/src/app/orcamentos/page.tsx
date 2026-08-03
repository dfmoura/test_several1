import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import { formatOrcamento } from "@/lib/codigos-documento";
import { prisma } from "@/lib/db";
import {
  isOrcamentoMutavel,
  STATUS_CHIP_CLASS,
  STATUS_LABEL,
} from "@/lib/orcamento-status";
import type { OrcamentoStatus } from "@prisma/client";

export default async function ListaOrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const status = sp.status?.trim() || "";
  const q = sp.q?.trim() || "";

  const items = await prisma.orcamento.findMany({
    where: {
      ...(status ? { status: status as OrcamentoStatus } : {}),
      ...(q
        ? {
            OR: [
              { clienteNome: { contains: q, mode: "insensitive" } },
              { vendedorNome: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statuses = Object.keys(STATUS_LABEL) as OrcamentoStatus[];

  return (
    <AppShell name={session.name} role={session.role}>
      <PageHeader
        kicker="Comercial · ORC"
        title="Orçamentos"
        subtitle="Proposta comercial com escada de preços · editável até aprovação ou reprovação."
        actions={
          <Link className="btn" href="/orcamentos/novo">
            Novo orçamento
          </Link>
        }
      />
      <section className="card-panel">
        <form className="toolbar" method="get" style={{ marginBottom: "1rem", gap: "0.65rem" }}>
          <label style={{ margin: 0, flex: 1 }}>
            Busca
            <input
              name="q"
              defaultValue={q}
              placeholder="Cliente ou vendedor"
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ margin: 0 }}>
            Status
            <select name="status" defaultValue={status}>
              <option value="">Todos</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="secondary" style={{ alignSelf: "end" }}>
            Filtrar
          </button>
        </form>
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
                      {formatOrcamento(o)}
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
                  Nenhum orçamento encontrado.{" "}
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
