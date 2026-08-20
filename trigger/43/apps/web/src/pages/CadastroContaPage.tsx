import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { OnboardingShell } from '../components/OnboardingShell';
import { ApiError, api, setToken } from '../lib/api';
import { useAuth } from '../lib/auth';

export function CadastroContaPage() {
  const { user, empresas, initialized, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!initialized) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        Carregando…
      </div>
    );
  }
  if (user && empresas.length > 0) {
    return <Navigate to="/" replace />;
  }
  if (user) {
    return <Navigate to="/cadastro/pagamento" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres, com letra e número.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.registerConta({
        admin_name: name,
        admin_email: email,
        admin_password: password,
      });
      setToken(res.token);
      await refresh();
      navigate('/cadastro/pagamento', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const first = Object.values(err.details ?? {})[0]?.[0];
        setError(first ?? err.message);
      } else {
        setError('Não foi possível abrir a conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      step={1}
      title="Sua conta de acesso"
      subtitle="Primeiro o acesso e a mensalidade FLEXORC. As empresas (até 3) você cadastra depois, já logado."
    >
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={(e) => void handleSubmit(e)}>
        <div className="form-group">
          <label htmlFor="admin_name">Seu nome</label>
          <input
            id="admin_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="admin_email">E-mail de acesso</label>
          <input
            id="admin_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="form-group">
          <label htmlFor="admin_password">Senha</label>
          <input
            id="admin_password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <p className="hint-inline">
          Você receberá um ID da conta (ex.: USR-00012). Guarde-o — o login aceita e-mail, ID ou os dois.
        </p>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
      <p className="subtitle" style={{ marginTop: '1rem' }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </OnboardingShell>
  );
}
