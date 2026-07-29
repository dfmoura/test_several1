"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Brand = {
  nomeFantasia: string;
  ambienteFiscal: "HOMOLOGACAO" | "PRODUCAO";
  simularProducao: boolean;
};

function NavLink({
  href,
  label,
  matchPrefix = false,
}: {
  href: string;
  label: string;
  matchPrefix?: boolean;
}) {
  const pathname = usePathname();
  const active = matchPrefix
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href;
  return (
    <Link href={href} className={active ? "active" : undefined}>
      {label}
    </Link>
  );
}

export function AppHeader({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/empresa");
        if (!res.ok) return;
        const j = (await res.json()) as Brand;
        if (!cancelled) setBrand(j);
      } catch {
        /* brand opcional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const brandLabel = brand?.nomeFantasia || "Orçamento Flexo";
  const envBadge =
    brand?.ambienteFiscal === "PRODUCAO" && !brand.simularProducao
      ? "Produção"
      : brand?.simularProducao
        ? "Teste · simula produção"
        : brand
          ? "Homologação"
          : null;

  return (
    <header className="topbar">
      <div className="brand-block">
        <Link href="/" className="brand">
          {brandLabel}
        </Link>
        {envBadge && <span className="env-badge">{envBadge}</span>}
      </div>
      <nav className="nav nav-groups" aria-label="Principal">
        <div className="nav-group">
          <span className="nav-group-label">Início</span>
          <NavLink href="/" label="Ciclo" />
        </div>
        <div className="nav-group">
          <span className="nav-group-label">Suprimentos</span>
          <NavLink href="/compras" label="Compras" matchPrefix />
          <NavLink href="/estoque" label="Estoque" matchPrefix />
        </div>
        <div className="nav-group">
          <span className="nav-group-label">Comercial</span>
          <NavLink href="/orcamentos/novo" label="Novo orçamento" />
          <NavLink href="/orcamentos" label="Orçamentos" matchPrefix />
        </div>
        <div className="nav-group">
          <span className="nav-group-label">Operação</span>
          <NavLink href="/pedidos" label="Pedidos" matchPrefix />
        </div>
        {role === "ADMIN" && (
          <div className="nav-group">
            <span className="nav-group-label">Cadastros</span>
            <NavLink href="/admin" label="Cadastros" matchPrefix />
          </div>
        )}
        <div className="nav-user">
          <span className="muted">
            {name} · {role}
          </span>
          <button type="button" className="secondary" onClick={logout}>
            Sair
          </button>
        </div>
      </nav>
    </header>
  );
}
