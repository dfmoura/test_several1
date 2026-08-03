import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FinanceiroClient } from "./FinanceiroClient";

export default async function FinanceiroPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <Suspense fallback={<p className="muted shell">Carregando financeiro…</p>}>
      <FinanceiroClient name={session.name} role={session.role} />
    </Suspense>
  );
}
