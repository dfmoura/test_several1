"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@flexo.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha no login");
        return;
      }
      router.push(params.get("next") || "/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 480, paddingTop: "4rem" }}>
      <div className="card-panel">
        <h1>Orçamento Flexo</h1>
        <p className="muted">Acesso interno — vendedores, PCP e administração.</p>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.9rem", marginTop: "1.25rem" }}>
          <label>
            E-mail
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Senha
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
          Demo: admin@flexo.local / Admin@123
        </p>
      </div>
    </div>
  );
}
