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
        kicker="Comercial · ORC"
        title="Novo orçamento"
        subtitle="Cabeçalho → especificação → faixas → calcular e salvar (snapshot auditável)."
        crumbs={[{ href: "/orcamentos", label: "Orçamentos" }]}
      />
      <QuoteWizard defaultVendedor={session.name} />
    </AppShell>
  );
}
