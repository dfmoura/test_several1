import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

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
          <div className="licensed-label">Licenciado para</div>
          <div className="logo-plate">
            <img src="/branding/cliente/logo-rlp.png" alt="RLP Etiquetas" />
          </div>
        </div>
        <a
          className="login-trigger-footer"
          href="https://www.triggerti.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Desenvolvido por</span>
          <img src="/branding/trigger/logo-trigger.png" alt="TRIGGER Data Intelligence" />
        </a>
      </div>

      <div className="login-form-panel">
        <div className="login-form-card">
          <h1>ERP RLP</h1>
          <p className="subtitle">Acesse o sistema de gestão industrial</p>

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
