"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <div className={styles.topbarBrand}>
            <strong>Reta</strong>
            <span>Gestão</span>
          </div>
        </header>
        <main className={`${styles.content} page-enter`}>{children}</main>
      </div>
    </div>
  );
}
