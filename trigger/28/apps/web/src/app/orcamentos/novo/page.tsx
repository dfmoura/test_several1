import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { QuoteWizard } from "@/components/QuoteWizard";
import { getSession } from "@/lib/auth";

export default async function NovoOrcamentoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell name={session.name} role={session.role}>
      <PageHeader
        kicker="3 · Comercial"
        title="Novo orçamento"
        subtitle="Wizard em 6 passos — cálculo determinístico espelhando a planilha oficial."
        crumbs={[{ href: "/orcamentos", label: "Orçamentos" }]}
      />
      <QuoteWizard defaultVendedor={session.name} />
    </AppShell>
  );
}
