import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type Empresa, type LoginResult } from './api';

type AuthState = {
  token: string | null;
  usuario: LoginResult['usuario'] | null;
  empresa: Empresa | null;
  empresas: Empresa[];
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  trocarEmpresa: (codigo: string) => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = 'erp-rlp.auth';

type Stored = {
  token: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<LoginResult['usuario'] | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((data: LoginResult | (LoginResult & { token?: string }), t: string) => {
    setToken(t);
    setUsuario(data.usuario);
    setEmpresa(data.empresa);
    setEmpresas(data.empresas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t } satisfies Stored));
  }, []);

  const refreshMe = useCallback(async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setLoading(false);
      return;
    }
    try {
      const stored = JSON.parse(raw) as Stored;
      const me = await api.me(stored.token);
      applySession({ ...me, token: stored.token }, stored.token);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
      setUsuario(null);
      setEmpresa(null);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(
    async (email: string, senha: string) => {
      const result = await api.login(email, senha);
      applySession(result, result.token);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await api.logout(token);
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUsuario(null);
    setEmpresa(null);
    setEmpresas([]);
  }, [token]);

  const trocarEmpresa = useCallback(
    async (codigo: string) => {
      if (!token) return;
      const result = await api.trocarEmpresa(token, codigo);
      const me = await api.me(result.token);
      applySession({ ...me, token: result.token }, result.token);
    },
    [token, applySession],
  );

  const value = useMemo(
    () => ({
      token,
      usuario,
      empresa,
      empresas,
      loading,
      login,
      logout,
      trocarEmpresa,
      refreshMe,
    }),
    [token, usuario, empresa, empresas, loading, login, logout, trocarEmpresa, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora de AuthProvider');
  return ctx;
}
