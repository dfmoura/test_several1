import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reta Gestão",
  description: "ERP operacional — Reta Etiquetas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
