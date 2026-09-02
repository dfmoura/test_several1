import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  ApiError,
  AUTH_EXPIRED_EVENT,
  getEmpresaId,
  getToken,
  setEmpresaId,
  setToken,
  type AuthEmpresa,
  type AuthMeResponse,
  type AuthUser,
  type BillingAviso,
  type ProdutoFlexorcSuperficie,
} from './api';
import { SessaoIdleBanner } from '../components/SessaoIdleBanner';
import { resolveSessaoPolitica } from './sessaoPresenca';
import { SESSAO_ACESSO } from './sessaoAcesso';

const SUPERFICIE_PADRAO: ProdutoFlexorcSuperficie = {
  ate_envio_link: false,
  sinal: true,
  financeiro: true,
};

type AuthState = {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  empresas: AuthEmpresa[];
  empresaId: number | null;
  maxEmpresas: number;
  produtoFlexorc: ProdutoFlexorcSuperficie;
  consolePlataforma: boolean;
  billingAviso: BillingAviso | null;
  idleMinutes: number;
  loading: boolean;
  initialized: boolean;
  bootError: string | null;
};

type AuthContextValue = AuthState & {
  login: (
    email: string,
    password: string,
    conta?: string,
    opts?: { encerrarSessaoAnterior?: boolean },
  ) => Promise<AuthMeResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setEmpresa: (id: number) => void;
  hasPermission: (permission: string) => boolean;
  /** Só permissões explícitas do `/me` — sem bypass de papel ADMIN. */
  hasGrantedPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function emptyLoggedOut(partial?: Partial<AuthState>): AuthState {
  return {
    user: null,
    roles: [],
    permissions: [],
    empresas: [],
    empresaId: null,
    maxEmpresas: 3,
    produtoFlexorc: SUPERFICIE_PADRAO,
    consolePlataforma: false,
    billingAviso: null,
    idleMinutes: SESSAO_ACESSO.idleMinutes,
    loading: false,
    initialized: true,
    bootError: null,
    ...partial,
  };
}

function resolveEmpresaId(me: AuthMeResponse): number | null {
  const stored = getEmpresaId();
  if (stored && me.empresas.some((e) => e.id === stored)) {
    return stored;
  }
  if (me.empresa_contexto?.id) {
    return me.empresa_contexto.id;
  }
  if (me.user.empresa_default_id && me.empresas.some((e) => e.id === me.user.empresa_default_id)) {
    return me.user.empresa_default_id;
  }
  const padrao = me.empresas.find((e) => e.padrao);
  return padrao?.id ?? me.empresas[0]?.id ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    roles: [],
    permissions: [],
    empresas: [],
    empresaId: null,
    maxEmpresas: 3,
    produtoFlexorc: SUPERFICIE_PADRAO,
    consolePlataforma: false,
    billingAviso: null,
    idleMinutes: SESSAO_ACESSO.idleMinutes,
    loading: false,
    initialized: false,
    bootError: null,
  });
  const restoreAttempts = useRef(0);
  const restoreTimer = useRef<number | null>(null);

  const applyMe = useCallback((me: AuthMeResponse) => {
    const empresaId = resolveEmpresaId(me);
    const politica = resolveSessaoPolitica(me.sessao);
    setEmpresaId(empresaId);
    restoreAttempts.current = 0;
    setState({
      user: me.user,
      roles: me.roles,
      permissions: me.permissions,
      empresas: me.empresas,
      empresaId,
      maxEmpresas: me.conta_flexorc?.max_empresas ?? 3,
      produtoFlexorc: me.produto_flexorc ?? SUPERFICIE_PADRAO,
      consolePlataforma: Boolean(me.console_plataforma),
      billingAviso: me.billing_aviso ?? null,
      idleMinutes: politica.idleMinutes,
      loading: false,
      initialized: true,
      bootError: null,
    });
  }, []);

  const clearSessionLocal = useCallback(() => {
    setToken(null);
    setEmpresaId(null);
    setState(emptyLoggedOut());
  }, []);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState(emptyLoggedOut({ initialized: true }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, bootError: null }));
    try {
      const me = await api.me();
      applyMe(me);
    } catch (err) {
      const isAuthDeath = err instanceof ApiError && err.status === 401;
      if (isAuthDeath || !getToken()) {
        clearSessionLocal();
        return;
      }

      // Rede/5xx: não destrói o PAT — re-tenta sem mandar ao login.
      if (restoreAttempts.current < 3) {
        restoreAttempts.current += 1;
        const delay = 1500 * restoreAttempts.current;
        setState((prev) => ({
          ...prev,
          loading: true,
          initialized: false,
          bootError: null,
        }));
        if (restoreTimer.current) window.clearTimeout(restoreTimer.current);
        restoreTimer.current = window.setTimeout(() => {
          void refresh();
        }, delay);
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        initialized: false,
        bootError: 'Não foi possível validar a sessão. Verifique a conexão e tente de novo.',
      }));
    }
  }, [applyMe, clearSessionLocal]);

  useEffect(() => {
    void refresh();
    return () => {
      if (restoreTimer.current) window.clearTimeout(restoreTimer.current);
    };
  }, [refresh]);

  useEffect(() => {
    const onExpired = () => {
      setEmpresaId(null);
      setState(emptyLoggedOut());
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
      conta?: string,
      opts?: { encerrarSessaoAnterior?: boolean },
    ) => {
      setState((prev) => ({ ...prev, loading: true, bootError: null }));
      try {
        const { token } = await api.login(email, password, conta, opts);
        setToken(token);
        const me = await api.me();
        applyMe(me);
        return me;
      } catch (err) {
        setState((prev) => ({ ...prev, loading: false }));
        throw err;
      }
    },
    [applyMe],
  );

  const logout = useCallback(async () => {
    try {
      if (getToken()) {
        await api.logout();
      }
    } catch {
      /* ignore logout errors */
    } finally {
      clearSessionLocal();
    }
  }, [clearSessionLocal]);

  const setEmpresa = useCallback((id: number) => {
    setEmpresaId(id);
    setState((prev) => ({ ...prev, empresaId: id }));
  }, []);

  const permissionList = useCallback((): string[] => {
    return Array.isArray(state.permissions)
      ? state.permissions
      : Object.values(state.permissions ?? {});
  }, [state.permissions]);

  const hasGrantedPermission = useCallback(
    (permission: string) => permissionList().includes(permission),
    [permissionList],
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (hasGrantedPermission(permission)) return true;
      if (permission.startsWith('plataforma.')) {
        return state.roles.includes('PLATAFORMA') || state.consolePlataforma;
      }
      // Superusuário da conta FLEXORC: enxerga módulos do produto, não o console TRIGGER.
      if (state.roles.includes('ADMIN')) return true;
      return false;
    },
    [hasGrantedPermission, state.roles, state.consolePlataforma],
  );

  const hasAnyPermission = useCallback(
    (...permissions: string[]) => permissions.some((p) => hasPermission(p)),
    [hasPermission],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refresh,
      setEmpresa,
      hasPermission,
      hasGrantedPermission,
      hasAnyPermission,
    }),
    [state, login, logout, refresh, setEmpresa, hasPermission, hasGrantedPermission, hasAnyPermission],
  );

  if (state.bootError && getToken()) {
    return (
      <AuthContext.Provider value={value}>
        <div className="loading" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ maxWidth: 360, textAlign: 'center' }}>{state.bootError}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              restoreAttempts.current = 0;
              void refresh();
            }}
          >
            Tentar novamente
          </button>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessaoIdleBanner enabled={Boolean(state.user)} idleMinutes={state.idleMinutes} />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
