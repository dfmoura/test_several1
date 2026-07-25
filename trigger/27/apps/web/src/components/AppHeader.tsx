"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppHeader({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link href={href} className={pathname === href ? "active" : undefined}>
      {label}
    </Link>
  );

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        Orçamento Flexo
      </Link>
      <nav className="nav">
        {link("/", "Início")}
        {link("/orcamentos/novo", "Novo orçamento")}
        {link("/orcamentos", "Lista")}
        {role === "ADMIN" && link("/admin", "Cadastros")}
        <span className="muted">
          {name} · {role}
        </span>
        <button type="button" className="secondary" onClick={logout}>
          Sair
        </button>
      </nav>
    </header>
  );
}
