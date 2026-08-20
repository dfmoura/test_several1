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
  getEmpresaId,
  getToken,
  setEmpresaId,
  setToken,
  type AuthEmpresa,
  type AuthMeResponse,
  type AuthUser,
  type ProdutoFlexorcSuperficie,
} from './api';

const SUPERFICIE_PADRAO: ProdutoFlexorcSuperficie = {
  ate_envio_link: true,
  sinal: false,
  financeiro: false,
};

type AuthState = {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  empresas: AuthEmpresa[];
  empresaId: number | null;
  maxEmpresas: number;
  produtoFlexorc: ProdutoFlexorcSuperficie;
  loading: boolean;
  initialized: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string, conta?: string) => Promise<void>;
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
        loading: false,
        initialized: true,
      });
    }
  }, [applyMe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string, conta?: string) => {
      setState((prev) => ({ ...prev, loading: true }));
      const { token } = await api.login(email, password, conta);
      setToken(token);
      const me = await api.me();
      applyMe(me);
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
      // Superusuário operacional: ADMIN enxerga todos os módulos no shell.
      // A API continua autorizando via Spatie can() (papéis sincronizados no boot).
      if (state.roles.includes('ADMIN')) return true;
      return false;
    },
    [state.permissions, state.roles],
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
