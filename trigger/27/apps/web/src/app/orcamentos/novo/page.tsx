import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { QuoteWizard } from "@/components/QuoteWizard";
import { getSession } from "@/lib/auth";

export default async function NovoOrcamentoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="shell">
      <AppHeader name={session.name} role={session.role} />
      <h1>Novo orçamento</h1>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Wizard em 6 passos — cálculo determinístico espelhando a planilha oficial.
      </p>
      <QuoteWizard defaultVendedor={session.name} />
    </div>
  );
}
