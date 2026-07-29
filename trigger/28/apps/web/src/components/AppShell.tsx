import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";

/**
 * Casca canônica do ERP: chrome full-bleed + área de trabalho fluida.
 * Por padrão usa canvas largo (shell-wide) — listas, grades e jornadas aproveitam a horizontal.
 * Use wide={false} só quando a tela for tipicamente de leitura estreita.
 */
export function AppShell({
  name,
  role,
  wide = true,
  children,
}: {
  name: string;
  role: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="app-frame">
      <AppHeader name={name} role={role} />
      <main className={wide ? "shell shell-wide" : "shell"}>{children}</main>
    </div>
  );
}
