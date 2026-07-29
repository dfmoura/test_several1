"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";

const sections = [
  {
    href: "/admin/empresa",
    title: "Empresa",
    description:
      "Cadastro único da emitente (raiz do sistema): dados fiscais, endereço e certificados digitais A1/A3.",
  },
  {
    href: "/admin/parceiros",
    title: "Parceiros",
    description:
      "Clientes, fornecedores, vendedores e usuários do sistema em um cadastro unificado (papéis múltiplos).",
  },
  {
    href: "/admin/produtos",
    title: "Produtos",
    description:
      "Insumos, acabados e serviços — NCM, vínculos com papel/acabamento/tubete, base de estoque e faturamento.",
  },
  {
    href: "/admin/papeis",
    title: "Papéis (materiais)",
    description: "Preços R$/m² dos substratos. Alterações geram audit log.",
  },
];

export default function AdminHub({ name, role }: { name: string; role: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resetOperacional() {
    if (
      !confirm(
        "Apagar TODOS os dados operacionais (orçamentos, pedidos, compras, estoque, NFs, boletos)?\n\nCadastros mestres (empresa, parceiros, produtos, papéis…) serão preservados.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/reset-operacional", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha no reset");
      setMsg(j.message || "Reset concluído.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <AppHeader name={name} role={role} />
      <h1>Cadastros</h1>
      <p className="muted">
        Tabelas mestres e entidades comerciais. Alterações sensíveis ficam no audit log.
      </p>
      <div className="grid-2" style={{ marginTop: "1.25rem" }}>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card-panel admin-card">
            <h2 style={{ fontSize: "1.25rem" }}>{s.title}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {s.description}
            </p>
          </Link>
        ))}
      </div>

      <section className="card-panel" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem" }}>Homologação</h2>
        <p className="muted">
          Limpa o ciclo operacional e mantém cadastros. Também via CLI:{" "}
          <code>npm run db:reset-ops</code>
        </p>
        {error && <p className="error">{error}</p>}
        {msg && <p className="ok">{msg}</p>}
        <button
          type="button"
          className="secondary danger-outline"
          disabled={busy}
          onClick={() => void resetOperacional()}
        >
          {busy ? "Limpando…" : "Resetar dados operacionais"}
        </button>
      </section>
    </div>
  );
}
