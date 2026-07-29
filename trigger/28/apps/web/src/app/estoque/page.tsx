import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { EstoqueClient } from "./EstoqueClient";

export default async function EstoquePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <EstoqueClient name={session.name} role={session.role} />;
}
