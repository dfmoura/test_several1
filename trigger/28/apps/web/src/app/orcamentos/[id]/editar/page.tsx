import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { QuoteWizard } from "@/components/QuoteWizard";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";
import { isOrcamentoMutavel, STATUS_LABEL } from "@/lib/orcamento-status";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const o = await prisma.orcamento.findUnique({ where: { id } });
  if (!o) notFound();

  if (!isOrcamentoMutavel(o.status)) {
    redirect(`/orcamentos/${id}`);
  }

  const input = o.inputSnapshot as OrcamentoInputSnapshot;
  const result = (o.resultSnapshot as OrcamentoResultSnapshot) || null;

  return (
    <AppShell name={session.name} role={session.role}>
      <PageHeader
        kicker="3 · Comercial"
        title={`Editar ${o.numero}-v${o.versao}`}
        subtitle={`Status: ${STATUS_LABEL[o.status]} — alterações permitidas enquanto aguarda decisão.`}
        crumbs={[
          { href: "/orcamentos", label: "Orçamentos" },
          { href: `/orcamentos/${id}`, label: `${o.numero}-v${o.versao}` },
        ]}
      />
      <QuoteWizard
        mode="edit"
        orcamentoId={o.id}
        defaultVendedor={input.vendedorNome || session.name}
        initialForm={{
          clienteParceiroId: input.clienteParceiroId || "",
          clienteNome: input.clienteNome || o.clienteNome,
          vendedorParceiroId: input.vendedorParceiroId || "",
          vendedorNome: input.vendedorNome || o.vendedorNome,
          observacoes: input.observacoes || "",
          medida: input.medida || "",
          larguraPapel: input.larguraPapel ?? 7.5,
          puxada: input.puxada ?? 1,
          cores: (input.cores as number | "4V") ?? 1,
          papel: input.papel || "",
          acabamento: input.acabamento || "",
          qtdeModelos: input.qtdeModelos ?? 1,
          qtdeColunas: input.qtdeColunas ?? 1,
          etiqPorRolo: input.etiqPorRolo ?? 1000,
          tubete: input.tubete || '3"',
          z: input.z ?? null,
          formatoFaca: input.formatoFaca || "",
          repeticao: 5,
          maquinaRoda: input.maquinaRoda || "",
          maquinaGrupo: input.maquinaGrupo || "MODULAR",
          impostoPct: input.impostoPct ?? 16,
          matriz: Boolean(input.matriz),
          colunaRebobinacao: input.colunaRebobinacao ?? 1,
          rpm: input.rpm ?? 1300,
          comissaoPct: input.comissaoPct ?? 5,
          faixas: input.faixas?.length
            ? input.faixas
            : [{ quantidade: 10000, tipoParada: "SEM PARADA" }],
        }}
        initialResult={
          result
            ? {
                valorMatrizBruto: result.valorMatrizBruto || 0,
                alerts: result.alerts || [],
                faixas: (result.faixas || []).map((f) => ({
                  production: {
                    quantidade: f.production.quantidade,
                    metragemLinear: f.production.metragemLinear || 0,
                    metragemM2: f.production.metragemM2 || 0,
                    horaMaquina: f.production.horaMaquina || 0,
                    qtdeRolos: f.production.qtdeRolos,
                    qtdeCaixas: f.production.qtdeCaixas || 0,
                  },
                  costs: {
                    valorPapel: f.costs.valorPapel || 0,
                    valorMaquina: f.costs.valorMaquina || 0,
                    tinta: f.costs.tinta || 0,
                    acabamento: f.costs.acabamento || 0,
                    rebobinacao: f.costs.rebobinacao || 0,
                    tubete: f.costs.tubete || 0,
                    valorCaixa: f.costs.valorCaixa || 0,
                    valorServico: f.costs.valorServico,
                  },
                  commercial: {
                    valorEtiqueta: f.commercial.valorEtiqueta,
                    valorMatriz: f.commercial.valorMatriz,
                    valorTotal: f.commercial.valorTotal,
                    servicoEncargos: f.commercial.servicoEncargos || 0,
                  },
                })),
              }
            : null
        }
      />
    </AppShell>
  );
}
