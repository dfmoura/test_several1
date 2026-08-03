import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ProdutosClient } from "./ProdutosClient";

export default async function ProdutosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "COMPRAS" && session.role !== "PCP") {
    redirect("/");
  }
  return <ProdutosClient name={session.name} role={session.role} />;
}
