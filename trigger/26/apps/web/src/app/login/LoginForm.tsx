"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { setSession } from "@/lib/auth";
import styles from "./login.module.css";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@reta.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.login(email, password);
      setSession(res.token, res.user);
      const next = searchParams.get("next") || "/";
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.formWrap} page-enter`}>
      <h1>Entrar</h1>
      <p className={styles.formHint}>Use suas credenciais internas</p>

      <form onSubmit={onSubmit} className={styles.form}>
        <label className="field">
          <span className="label">E-mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span className="label">Senha</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Entrando…" : "Acessar sistema"}
        </button>
      </form>

      <p className={styles.seedHint}>Seed local: admin@reta.local / admin123</p>
    </div>
  );
}
