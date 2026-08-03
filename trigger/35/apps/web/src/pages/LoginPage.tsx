import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { ApiError } from '../lib/api';

export function LoginPage() {
  const { token, login } = useAuth();
  const [email, setEmail] = useState('admin@rlp.local');
  const [senha, setSenha] = useState('Admin@RLP2026!');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    try {
      await login(email, senha);
    } catch (err) {
      const apiErr = err as ApiError;
      setErro(apiErr.message ?? 'Falha no login');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-layout">
      <div className="login-panel">
        <header className="login-brand">
          <span className="brand-mark xl">RLP</span>
          <p>Etiquetas · ERP operacional</p>
        </header>
        <form className="login-form" onSubmit={onSubmit}>
          <h1>Entrar</h1>
          <p className="muted">Login individual — sem usuário compartilhado.</p>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>
          {erro ? <p className="error">{erro}</p> : null}
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
      <div className="login-visual" aria-hidden>
        <div className="visual-copy">
          <p className="eyebrow">Fase 0 · Plataforma</p>
          <p className="visual-title">Fundação antes do fluxo que paga o dia.</p>
          <p>Auth · RBAC · multi-empresa · auditoria · parâmetros</p>
        </div>
      </div>
    </div>
  );
}
