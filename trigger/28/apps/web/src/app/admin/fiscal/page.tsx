import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import FiscalClient from "./FiscalClient";

export default async function AdminFiscalPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "FINANCEIRO") redirect("/");
  return <FiscalClient name={session.name} role={session.role} />;
}
