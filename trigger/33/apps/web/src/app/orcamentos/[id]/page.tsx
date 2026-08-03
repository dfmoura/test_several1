import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OrcamentoDetailClient } from "@/components/OrcamentoDetailClient";
import { getSession } from "@/lib/auth";
import { loadComercialParamsFromDb } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import type {
  OrcamentoInputSnapshot,
  OrcamentoResultSnapshot,
} from "@/lib/orcamento-comercial";
import { isOrcamentoMutavel } from "@/lib/orcamento-status";

export default async function OrcamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const [o, comercial] = await Promise.all([
    prisma.orcamento.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        decididoPor: { select: { id: true, name: true, email: true } },
      },
    }),
    loadComercialParamsFromDb(),
  ]);
  if (!o) notFound();

  const input = o.inputSnapshot as OrcamentoInputSnapshot;
  const comercialMerged = {
    prazoEntrega: input.prazoEntrega || comercial.prazoEntrega,
    validade: input.validadeProposta || comercial.validade,
    clausulaQuantidade:
      input.toleranciaQtdPct != null
        ? `As quantidades podem variar ±${input.toleranciaQtdPct}%`
        : comercial.clausulaQuantidade,
  };

  return (
    <AppShell name={session.name} role={session.role}>
      <OrcamentoDetailClient
        id={o.id}
        numero={o.numero}
        versao={o.versao}
        status={o.status}
        clienteNome={o.clienteNome}
        vendedorNome={o.vendedorNome}
        observacoes={o.observacoes}
        data={o.data.toISOString()}
        enviadoEm={o.enviadoEm?.toISOString() ?? null}
        decididoEm={o.decididoEm?.toISOString() ?? null}
        motivoDecisao={o.motivoDecisao}
        mutavel={isOrcamentoMutavel(o.status)}
        createdByName={o.createdBy.name}
        decididoPor={o.decididoPor}
        input={input}
        result={(o.resultSnapshot as OrcamentoResultSnapshot) || null}
        comercial={comercialMerged}
        role={session.role}
      />
    </AppShell>
  );
}
