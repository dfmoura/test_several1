import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@rlp.com.br');
  const [password, setPassword] = useState('Admin@123');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setPending(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <h1>RLP Etiquetas</h1>
          <p className="muted">Entre com suas credenciais para acessar o ERP.</p>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <p className="muted" style={{ fontSize: '0.82rem', marginTop: '0.75rem' }}>
            Admin: admin@rlp.com.br / Admin@123
            <br />
            Demos por perfil: comercial@ / financeiro@ / … @rlp.com.br — senha Demo@123
          </p>
          {erro ? <p className="error">{erro}</p> : null}
          <button type="submit" className="btn primary" disabled={pending} style={{ marginTop: '1.25rem' }}>
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
      <aside className="login-visual">
        <div>
          <h2 className="display">Homologação ERP flexo</h2>
          <p>Orçamento → Pedido → Produção → Fiscal → Financeiro → Entrega</p>
        </div>
      </aside>
    </div>
  );
}
