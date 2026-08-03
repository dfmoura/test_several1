import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ProducaoClient } from "./ProducaoClient";

export default async function ProducaoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <Suspense fallback={<p className="muted shell">Carregando produção…</p>}>
      <ProducaoClient name={session.name} role={session.role} />
    </Suspense>
  );
}
