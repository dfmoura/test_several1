import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";
import { getSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");
  return <AdminClient name={session.name} role={session.role} />;
}
