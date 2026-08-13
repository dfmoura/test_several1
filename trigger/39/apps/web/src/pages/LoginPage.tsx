import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { TriggerAttribution, TriggerByline } from '../components/TriggerAttribution';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';

export function LoginPage() {
  const { login, user, initialized, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (initialized && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldError = err.details?.email?.[0];
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
          <div className="licensed-label">{BRAND.licensee.licensedLabel}</div>
          <div className="logo-plate">
            <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} />
          </div>
        </div>
        <TriggerAttribution variant="interactive" className="login-trigger-footer" />
      </div>

      <div className="login-form-panel">
        <div className="login-form-card">
          <p className="login-product-eyebrow">{BRAND.licensee.productLabel}</p>
          <h1>{BRAND.licensee.productName}</h1>
          <TriggerByline className="login-product-byline" />
          <p className="subtitle">
            Sistema da TRIGGER licenciado para {BRAND.licensee.shortName}. Depois do login, você
            opera na empresa ativa (EMP) — filiais do mesmo grupo, não outro produto.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rlp.com.br"
                required
                autoComplete="username"
              />
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
        </div>
      </div>
    </div>
  );
}
