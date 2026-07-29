"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Brand = {
  nomeFantasia: string;
  ambienteFiscal: "HOMOLOGACAO" | "PRODUCAO";
  simularProducao: boolean;
};

type NavItem = {
  href: string;
  label: string;
  matchPrefix?: boolean;
  exact?: boolean;
  adminOnly?: boolean;
};

/** Navegação primária plana — padrão ERP (um nível, sem grupos no topo). */
const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Início", exact: true },
  { href: "/compras", label: "Compras", matchPrefix: true },
  { href: "/estoque", label: "Estoque", matchPrefix: true },
  { href: "/orcamentos", label: "Orçamentos", matchPrefix: true },
  { href: "/pedidos", label: "Pedidos", matchPrefix: true },
  { href: "/financeiro", label: "Financeiro", matchPrefix: true },
  { href: "/admin", label: "Cadastros", matchPrefix: true, adminOnly: true },
];

/** Agrupamento só no drawer mobile (contexto operacional). */
const DRAWER_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operação",
    items: [
      { href: "/", label: "Início · ciclo", exact: true },
      { href: "/compras", label: "Compras", matchPrefix: true },
      { href: "/estoque", label: "Estoque", matchPrefix: true },
      { href: "/orcamentos", label: "Orçamentos", matchPrefix: true },
      { href: "/pedidos", label: "Pedidos · NF · Boleto", matchPrefix: true },
      { href: "/financeiro", label: "Financeiro · AR/AP · Banco", matchPrefix: true },
    ],
  },
  {
    label: "Atalhos",
    items: [{ href: "/orcamentos/novo", label: "Novo orçamento", exact: true }],
  },
  {
    label: "Administração",
    items: [
      { href: "/admin", label: "Cadastros", matchPrefix: true, adminOnly: true },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  if (item.matchPrefix) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return true;
    }
  }
  return pathname === item.href;
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "Administrador",
    VENDEDOR: "Vendedor",
    ORCAMENTISTA: "Orçamentista",
    PCP: "PCP",
    COMPRAS: "Compras",
    FINANCEIRO: "Financeiro",
    EXPEDICAO: "Expedição",
    OPERADOR: "Operador",
    ESTOQUE: "Estoque",
  };
  return map[role] ?? role;
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      className={active ? "nav-link active" : "nav-link"}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
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
  const pathname = usePathname();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

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

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = drawerRef.current?.querySelector<HTMLElement>(
      "a, button:not([disabled])",
    );
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      toggleRef.current?.focus();
    };
  }, [menuOpen, closeMenu]);

  async function logout() {
    closeMenu();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isProducao =
    brand?.ambienteFiscal === "PRODUCAO" && !brand.simularProducao;
  const envBadge = isProducao
    ? "Produção"
    : brand?.simularProducao
      ? "Homologação · simulado"
      : "Homologação";
  const envClass = isProducao ? "env-badge env-prod" : "env-badge env-homo";

  const primary = PRIMARY_NAV.filter((i) => !i.adminOnly || role === "ADMIN");
  const drawerSections = DRAWER_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((i) => !i.adminOnly || role === "ADMIN"),
  })).filter((sec) => sec.items.length > 0);

  const isNovoOrcamento =
    pathname === "/orcamentos/novo" || pathname.startsWith("/orcamentos/novo/");

  return (
    <header className="app-chrome">
      <div className="app-chrome-inner">
        <div className="topbar-start">
          <button
            ref={toggleRef}
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls={drawerId}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="nav-toggle-bars" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>

          <Link href="/" className="brand" aria-label="Reta Etiquetas — início">
            <Image
              src="/brand/logotipo-retaetiquetas.png"
              alt="Reta Etiquetas"
              width={118}
              height={60}
              className="brand-logo"
              priority
              unoptimized
            />
          </Link>
          <span className={envClass} title="Ambiente fiscal">
            {envBadge}
          </span>
        </div>

        <nav className="nav-desktop" aria-label="Módulos do ERP">
          {primary.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(pathname, item)}
            />
          ))}
        </nav>

        <div className="nav-actions">
          <Link
            href="/orcamentos/novo"
            className={
              isNovoOrcamento ? "btn nav-cta is-active" : "btn nav-cta"
            }
            onClick={closeMenu}
          >
            Novo orçamento
          </Link>
          <div className="nav-user">
            <div className="nav-user-meta">
              <span className="nav-user-name">{name}</span>
              <span className="nav-user-role">{roleLabel(role)}</span>
            </div>
            <button
              type="button"
              className="secondary nav-logout"
              onClick={logout}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <div
        className={menuOpen ? "nav-backdrop is-open" : "nav-backdrop"}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />

      <aside
        ref={drawerRef}
        id={drawerId}
        className={menuOpen ? "nav-drawer is-open" : "nav-drawer"}
        aria-label="Navegação"
        aria-hidden={!menuOpen}
        inert={!menuOpen ? true : undefined}
      >
        <div className="nav-drawer-head">
          <div>
            <p className="nav-drawer-kicker">Reta Etiquetas · ERP</p>
            <p className="nav-drawer-user">
              {name}
              <span className="nav-user-role">{roleLabel(role)}</span>
            </p>
          </div>
          <button
            type="button"
            className="secondary nav-drawer-close"
            onClick={closeMenu}
            aria-label="Fechar menu"
          >
            Fechar
          </button>
        </div>

        <nav className="nav-mobile" aria-label="Módulos do ERP">
          {drawerSections.map((sec) => (
            <div key={sec.label} className="nav-drawer-section">
              <p className="nav-drawer-section-label">{sec.label}</p>
              <div className="nav-drawer-links">
                {sec.items.map((item) => (
                  <NavLink
                    key={`${sec.label}-${item.href}`}
                    href={item.href}
                    label={item.label}
                    active={isActive(pathname, item)}
                    onNavigate={closeMenu}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="nav-drawer-foot">
          <span className={envClass}>{envBadge}</span>
          <button type="button" className="secondary" onClick={logout}>
            Encerrar sessão
          </button>
        </div>
      </aside>
    </header>
  );
}
