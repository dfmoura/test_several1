import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { api } from '@/lib/api';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(password);
      navigate('/');
    } catch {
      setError('Senha inválida. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <FileText size={28} />
          </div>
          <h1 className="text-2xl font-semibold">NFS-e Nacional</h1>
          <p className="mt-1 text-sm text-slate-400">Console de administração e operação</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <label className="label" htmlFor="password">Senha de acesso</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite a senha do console"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="mt-4 text-center text-xs text-slate-400">
            Senha padrão em dev: <code className="rounded bg-slate-100 px-1">admin</code>
          </p>
        </form>
      </div>
    </div>
  );
}
