import type { ReactNode } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";

/**
 * Casca canônica do ERP: chrome full-bleed + área de trabalho fluida.
 * Crédito Trigger no rodapé — sistema desenvolvido pela Trigger.
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
      <footer className="app-footer">
        <div className="app-footer-inner">
          <span className="app-footer-product">Reta Etiquetas · ERP</span>
          <a
            className="vendor-credit vendor-credit--footer"
            href="https://www.triggerti.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Trigger Data Intelligence"
          >
            <Image
              src="/brand/trigger-mark.png"
              alt=""
              width={16}
              height={16}
              className="vendor-mark"
              unoptimized
            />
            <span>
              Desenvolvido pela <strong>Trigger</strong>
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}
