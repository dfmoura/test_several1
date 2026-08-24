import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ProductLogo } from '../components/ProductLogo';
import { TriggerAttribution, TriggerByline } from '../components/TriggerAttribution';
import { ApiError, AUTH_EXPIRED_MSG_KEY } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/brand';
import { sessaoAcessoLoginHint } from '../lib/sessaoAcesso';

export function LoginPage() {
  const { login, user, initialized, loading, consolePlataforma } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [conta, setConta] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorTone, setErrorTone] = useState<'error' | 'warning'>('error');
  const [takeover, setTakeover] = useState(false);

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem(AUTH_EXPIRED_MSG_KEY);
      if (msg) {
        sessionStorage.removeItem(AUTH_EXPIRED_MSG_KEY);
        setError(msg);
        setErrorTone('warning');
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (initialized && user) {
    return <Navigate to={consolePlataforma ? '/plataforma' : '/'} replace />;
  }

  const entrar = async (encerrarSessaoAnterior: boolean) => {
    setError('');
    setErrorTone('error');
    if (!email.trim() && !conta.trim()) {
      setError('Informe o e-mail, o ID da conta, ou os dois.');
      return;
    }
    try {
      const me = await login(email, password, conta, { encerrarSessaoAnterior });
      setTakeover(false);
      if (me.console_plataforma) {
        navigate('/plataforma');
        return;
      }
      if (me.billing_aviso?.acao === 'autenticar') {
        navigate(me.billing_aviso.to || '/conta/mensalidade');
        return;
      }
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        const podeEncerrarAnterior =
          err.code === 'SESSAO_OCUPADA' || err.payload?.pode_encerrar_anterior === true;
        if (err.status === 409 && podeEncerrarAnterior) {
          setTakeover(true);
          setErrorTone('warning');
          setError(err.message);
          return;
        }
        setTakeover(false);
        const fieldError = err.details?.email?.[0] ?? err.details?.conta?.[0];
        setError(fieldError ?? err.message);
        setErrorTone(err.code === 'SESSOES_LIMITE' ? 'warning' : 'error');
      } else {
        setTakeover(false);
        setError('Não foi possível entrar. Tente novamente.');
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Em takeover, Enter / «Entrar» confirma o derrube (como no fluxo do 23).
    await entrar(takeover);
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
            Entre com o acesso provisionado pelo administrador master. Empresas e usuários
            ficam organizados na conta — cada empresa opera isolada.
          </p>

          {error && (
            <div className={`alert ${errorTone === 'warning' ? 'alert-warning' : 'alert-error'}`}>
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setTakeover(false);
                }}
                placeholder="emma.t@example.net"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="conta">ID da conta</label>
              <input
                id="conta"
                value={conta}
                onChange={(e) => {
                  setConta(e.target.value);
                  setTakeover(false);
                }}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  setTakeover(false);
                }}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading
                ? takeover
                  ? 'Encerrando sessão anterior…'
                  : 'Entrando…'
                : takeover
                  ? 'Encerrar sessão anterior e entrar'
                  : 'Entrar'}
            </button>
          </form>

          {takeover && (
            <div className="login-takeover" role="status">
              <p>
                Há uma sessão aberta com este usuário (outro computador, outra aba ou um
                acesso que não foi encerrado). Confirme acima para encerrar a anterior e
                entrar aqui.
              </p>
            </div>
          )}

          <p className="login-idle-hint">{sessaoAcessoLoginHint()}</p>
          <p className="subtitle" style={{ marginTop: '1.25rem' }}>
            Ainda não tem acesso? Peça ao administrador master para criar seu usuário e
            enviar o e-mail e a senha. O login é só para entrar — não há cadastro público.
          </p>
        </div>
      </div>
    </div>
  );
}
