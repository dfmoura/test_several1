import { redirect } from "next/navigation";
import ParceirosClient from "./ParceirosClient";
import { getSession } from "@/lib/auth";

export default async function ParceirosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");
  return <ParceirosClient name={session.name} role={session.role} />;
}
