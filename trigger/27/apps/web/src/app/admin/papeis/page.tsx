import { redirect } from "next/navigation";
import AdminPapeisClient from "./AdminPapeisClient";
import { getSession } from "@/lib/auth";

export default async function AdminPapeisPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");
  return <AdminPapeisClient name={session.name} role={session.role} />;
}
