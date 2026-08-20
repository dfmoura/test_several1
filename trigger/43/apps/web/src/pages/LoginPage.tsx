import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ProductLogo } from '../components/ProductLogo';
import { TriggerAttribution, TriggerByline } from '../components/TriggerAttribution';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';

export function LoginPage() {
  const { login, user, initialized, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [conta, setConta] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (initialized && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() && !conta.trim()) {
      setError('Informe o e-mail, o ID da conta, ou os dois.');
      return;
    }
    try {
      await login(email, password, conta);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldError = err.details?.email?.[0] ?? err.details?.conta?.[0];
        setError(fieldError ?? err.message);
      } else {
        setError('Não foi possível entrar. Tente novamente.');
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-client-area">
          <div className="licensed-label">{BRAND.product.tagline}</div>
          <div className="logo-plate logo-plate--hero">
            <ProductLogo decorative className="login-hero-mark" />
            <span className="login-hero-wordmark">{BRAND.product.name}</span>
          </div>
        </div>
        <TriggerAttribution variant="interactive" className="login-trigger-footer" />
      </div>

      <div className="login-form-panel">
        <div className="login-form-card">
          <p className="login-product-eyebrow">{BRAND.product.label}</p>
          <h1>{BRAND.product.name}</h1>
          <TriggerByline className="login-product-byline" />
          <p className="subtitle">
            Entre na sua conta. Empresas e usuários ficam organizados nela — cada empresa opera isolada.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="emma.t@example.net"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="conta">ID da conta</label>
              <input
                id="conta"
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                placeholder="USR-00012"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="hint-inline">Opcional se o e-mail basta. Obrigatório se você entrar só com o ID.</span>
            </div>
            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <p className="subtitle" style={{ marginTop: '1.25rem' }}>
            Ainda não tem conta? <Link to="/cadastro/conta">Abrir minha conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
