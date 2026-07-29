import { redirect } from "next/navigation";
import EmpresaClient from "./EmpresaClient";
import { getSession } from "@/lib/auth";

export default async function EmpresaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");
  return <EmpresaClient name={session.name} role={session.role} />;
}
