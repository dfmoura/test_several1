import { redirect } from "next/navigation";
import AdminHub from "./AdminHub";
import { getSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");
  return <AdminHub name={session.name} role={session.role} />;
}
