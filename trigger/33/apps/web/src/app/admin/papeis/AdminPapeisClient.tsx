"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

type Papel = { id: string; nome: string; precoM2: number; ativo: boolean };

export default function AdminPapeisClient({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const [items, setItems] = useState<Papel[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/papeis");
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(id: string, precoM2: number) {
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/papeis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, precoM2 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao atualizar preço.");
      return;
    }
    setMsg(`Preço de ${data.nome} atualizado — audit log registrado.`);
    await load();
  }

  return (
    <AppShell name={name} role={role}>
      <PageHeader
        kicker="Cadastros"
        title="Papéis (materiais)"
        subtitle="Alterações de preço geram audit log (quem, quando, antigo → novo)."
        crumbs={[{ href: "/admin", label: "Cadastros" }]}
      />
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {msg && (
        <div className="alert-ok" role="status">
          {msg}
        </div>
      )}
      <section className="card-panel">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>R$/m²</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <PapelRow key={p.id} papel={p} onSave={save} />
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

function PapelRow({
  papel,
  onSave,
}: {
  papel: Papel;
  onSave: (id: string, preco: number) => Promise<void>;
}) {
  const [preco, setPreco] = useState(String(papel.precoM2));
  return (
    <tr>
      <td>{papel.nome}</td>
      <td>
        <input
          type="number"
          step="0.01"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          style={{ maxWidth: 120 }}
        />
      </td>
      <td>
        <button type="button" onClick={() => onSave(papel.id, Number(preco))}>
          Salvar
        </button>
      </td>
    </tr>
  );
}
