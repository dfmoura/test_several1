"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@reta.local");
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
    <div className="login-hero">
      <div className="login-card">
        <div className="login-brand">
          <Image
            src="/brand/logotipo-retaetiquetas.png"
            alt="Reta Etiquetas"
            width={180}
            height={90}
            className="login-logo"
            priority
            unoptimized
          />
        </div>
        <p className="muted">
          Acesse com seu usuário para continuar.
        </p>
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
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
          Homologação: admin@reta.local / Admin@123
        </p>
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.78rem" }}>
          EMP-00001 · RLP Etiquetas · 01.423.183/0001-10
        </p>
      </div>
      <a
        className="vendor-credit vendor-credit--auth"
        href="https://www.triggerti.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Trigger Data Intelligence"
      >
        <Image
          src="/brand/trigger-mark.png"
          alt=""
          width={18}
          height={18}
          className="vendor-mark"
          unoptimized
        />
        <span>Desenvolvido pela <strong>Trigger</strong></span>
      </a>
    </div>
  );
}
