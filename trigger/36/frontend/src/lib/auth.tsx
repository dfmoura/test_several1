import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, TOKEN_KEY, type Usuario } from './api';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (...perms: string[]) => boolean;
  canAny: (...perms: string[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    setUsuario(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setUsuario(null);
      return;
    }
    authApi.me().then(setUsuario).catch(() => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUsuario(null);
    });
  }, [token]);

  const can = useCallback(
    (...perms: string[]) => {
      if (!usuario) return false;
      if (usuario.role === 'ADMIN') return true;
      const have = new Set(usuario.permissoes ?? []);
      return perms.every((p) => have.has(p));
    },
    [usuario],
  );

  const canAny = useCallback(
    (...perms: string[]) => {
      if (!usuario) return false;
      if (usuario.role === 'ADMIN') return true;
      const have = new Set(usuario.permissoes ?? []);
      return perms.some((p) => have.has(p));
    },
    [usuario],
  );

  const value = useMemo(
    () => ({ token, usuario, login, logout, can, canAny }),
    [token, usuario, login, logout, can, canAny],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
