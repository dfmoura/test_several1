import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { QuoteWizard } from "@/components/QuoteWizard";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";
import { isOrcamentoMutavel, STATUS_LABEL } from "@/lib/orcamento-status";
import type { QuoteResult } from "@orcamento/pricing-engine";

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
  const resultSnap = (o.resultSnapshot as OrcamentoResultSnapshot) || null;

  const initialResult: QuoteResult | null = resultSnap?.faixas?.length
    ? {
        valorMatrizBruto: resultSnap.valorMatrizBruto || 0,
        valorMatriz: resultSnap.valorMatriz ?? resultSnap.faixas[0]?.commercial.valorMatriz ?? 0,
        matrizCobrada: resultSnap.matrizCobrada ?? Boolean(input.matriz && !input.matrizJaCobrada),
        alerts: resultSnap.alerts || [],
        faixas: resultSnap.faixas.map((f) => ({
          production: {
            quantidade: f.production.quantidade,
            tipoParada: f.production.tipoParada || "SEM PARADA",
            metragemLinear: f.production.metragemLinear || 0,
            metragemM2: f.production.metragemM2 || 0,
            horaMaquina: f.production.horaMaquina || 0,
            horaTrocaProduto: f.production.horaTrocaProduto || 0,
            horaTrocaBobina: f.production.horaTrocaBobina || 0,
            perdaAcerto: f.production.perdaAcerto || 0,
            perdaAcabamento: f.production.perdaAcabamento || 0,
            perdaPapelTrocaProduto: f.production.perdaPapelTrocaProduto || 0,
            perdaTrocaBobinaM2: f.production.perdaTrocaBobinaM2 || 0,
            qtdeRolos: f.production.qtdeRolos,
            qtdeCaixas: f.production.qtdeCaixas || 0,
            rolosPorCaixa: f.production.rolosPorCaixa || 12,
          },
          costs: {
            valorPapel: f.costs.valorPapel || 0,
            valorMaquina: f.costs.valorMaquina || 0,
            valorTrocaProduto: f.costs.valorTrocaProduto || 0,
            valorTrocaBobina: f.costs.valorTrocaBobina || 0,
            valorPapelTrocaProduto: f.costs.valorPapelTrocaProduto || 0,
            tinta: f.costs.tinta || 0,
            acabamento: f.costs.acabamento || 0,
            rebobinacao: f.costs.rebobinacao || 0,
            tubete: f.costs.tubete || 0,
            valorCaixa: f.costs.valorCaixa || 0,
            valorServico: f.costs.valorServico,
          },
          commercial: {
            comissaoPct: f.commercial.comissaoPct ?? input.comissaoPct ?? 0,
            comissao: f.commercial.comissao || 0,
            imposto: f.commercial.imposto || 0,
            servicoEncargos: f.commercial.servicoEncargos || 0,
            valorEtiqueta: f.commercial.valorEtiqueta,
            valorMatriz: f.commercial.valorMatriz,
            valorTotal: f.commercial.valorTotal,
          },
        })),
      }
    : null;

  return (
    <AppShell name={session.name} role={session.role}>
      <PageHeader
        kicker="3 · Comercial"
        title={`Editar ${o.numero}-v${o.versao}`}
        subtitle={`Status: ${STATUS_LABEL[o.status]} — formulário linear estilo planilha.`}
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
          isProspect: Boolean(input.isProspect),
          prospectDocumento: input.prospectDocumento || "",
          prospectTelefone: input.prospectTelefone || "",
          prospectEmail: input.prospectEmail || "",
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
          repeticao: input.repeticao ?? 5,
          maquinaRoda: input.maquinaRoda || "",
          maquinaGrupo: input.maquinaGrupo || "MODULAR",
          impostoPct: input.impostoPct ?? 16,
          matriz: Boolean(input.matriz),
          matrizJaCobrada: Boolean(input.matrizJaCobrada),
          colunaRebobinacao: input.colunaRebobinacao ?? 1,
          rpm: input.rpm ?? 1300,
          comissaoPct: input.comissaoPct ?? 5,
          overridePapelM2:
            input.overrides?.papelM2 != null ? String(input.overrides.papelM2) : "",
          overrideTintaM2:
            input.overrides?.tintaAcimaM2 != null
              ? String(input.overrides.tintaAcimaM2)
              : "",
          prazoEntrega: input.prazoEntrega || "12 DIAS ÚTEIS",
          validadeProposta: input.validadeProposta || "7 dias",
          validadeDias: input.validadeDias ?? 7,
          toleranciaQtdPct: input.toleranciaQtdPct ?? 20,
          faixas: input.faixas?.length
            ? input.faixas.map((f) => ({
                quantidade: f.quantidade,
                tipoParada: f.tipoParada,
                comissaoPct: f.comissaoPct ?? input.comissaoPct ?? 5,
              }))
            : undefined,
        }}
        initialResult={initialResult}
      />
    </AppShell>
  );
}
