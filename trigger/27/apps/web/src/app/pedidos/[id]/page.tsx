import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PedidoJornadaClient } from "@/components/PedidoJornadaClient";

export default async function PedidoJornadaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <PedidoJornadaClient id={id} name={session.name} role={session.role} />;
}
