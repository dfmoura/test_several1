import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
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
  loading: boolean;
  initialized: boolean;
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
  hasAnyPermission: (...permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
    loading: false,
    initialized: false,
  });

  const applyMe = useCallback((me: AuthMeResponse) => {
    const empresaId = resolveEmpresaId(me);
    setEmpresaId(empresaId);
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
      loading: false,
      initialized: true,
    });
  }, []);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState((prev) => ({
        ...prev,
        user: null,
        roles: [],
        permissions: [],
        empresas: [],
        empresaId: null,
        maxEmpresas: 3,
        produtoFlexorc: SUPERFICIE_PADRAO,
        consolePlataforma: false,
        billingAviso: null,
        loading: false,
        initialized: true,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const me = await api.me();
      applyMe(me);
    } catch {
      setToken(null);
      setEmpresaId(null);
      setState({
        user: null,
        roles: [],
        permissions: [],
        empresas: [],
        empresaId: null,
        maxEmpresas: 3,
        produtoFlexorc: SUPERFICIE_PADRAO,
        consolePlataforma: false,
        billingAviso: null,
        loading: false,
        initialized: true,
      });
    }
  }, [applyMe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onExpired = () => {
      setEmpresaId(null);
      setState({
        user: null,
        roles: [],
        permissions: [],
        empresas: [],
        empresaId: null,
        maxEmpresas: 3,
        produtoFlexorc: SUPERFICIE_PADRAO,
        consolePlataforma: false,
        billingAviso: null,
        loading: false,
        initialized: true,
      });
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
      setState((prev) => ({ ...prev, loading: true }));
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
      setToken(null);
      setEmpresaId(null);
      setState({
        user: null,
        roles: [],
        permissions: [],
        empresas: [],
        empresaId: null,
        maxEmpresas: 3,
        produtoFlexorc: SUPERFICIE_PADRAO,
        consolePlataforma: false,
        billingAviso: null,
        loading: false,
        initialized: true,
      });
    }
  }, []);

  const setEmpresa = useCallback((id: number) => {
    setEmpresaId(id);
    setState((prev) => ({ ...prev, empresaId: id }));
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      const perms = Array.isArray(state.permissions)
        ? state.permissions
        : Object.values(state.permissions ?? {});
      if (perms.includes(permission)) return true;
      if (permission.startsWith('plataforma.')) {
        return state.roles.includes('PLATAFORMA') || state.consolePlataforma;
      }
      // Superusuário da conta FLEXORC: enxerga módulos do produto, não o console TRIGGER.
      if (state.roles.includes('ADMIN')) return true;
      return false;
    },
    [state.permissions, state.roles, state.consolePlataforma],
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
      hasAnyPermission,
    }),
    [state, login, logout, refresh, setEmpresa, hasPermission, hasAnyPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
