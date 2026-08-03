import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ComprasClient } from "./ComprasClient";

export default async function ComprasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <Suspense fallback={<p className="muted shell">Carregando compras…</p>}>
      <ComprasClient name={session.name} role={session.role} />
    </Suspense>
  );
}
