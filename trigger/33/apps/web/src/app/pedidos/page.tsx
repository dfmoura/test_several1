import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PedidosClient } from "./PedidosClient";

export default async function PedidosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <PedidosClient name={session.name} role={session.role} />;
}
