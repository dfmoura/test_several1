"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import styles from "./Sidebar.module.css";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◫" },
  { href: "/clientes", label: "Clientes", icon: "◎" },
  { href: "/orcamentos", label: "Orçamentos", icon: "◈" },
  { href: "/pedidos", label: "Pedidos", icon: "▣" },
  { href: "/ordens", label: "Ordens de serviço", icon: "⚙" },
  { href: "/estoque", label: "Estoque", icon: "▤" },
  { href: "/compras", label: "Compras", icon: "↗" },
  { href: "/faturamento", label: "Faturamento", icon: "▦" },
  { href: "/entregas", label: "Entregas", icon: "➤" },
  { href: "/financeiro", label: "Financeiro", icon: "₿" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>Reta</span>
          <span className={styles.brandSub}>Gestão</span>
          <span className={styles.brandTag}>Etiquetas adesivas</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                onClick={onClose}
              >
                <span className={styles.linkIcon} aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <button type="button" className={styles.logout} onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
