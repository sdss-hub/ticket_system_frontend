import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { UserDto } from '../api/types';
import { AuthApi } from '../api/auth';
import { setApiAuthTokenGetter } from '../api/client';

type AuthContextType = {
  user: UserDto | null;
  token: string | null;
  restoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: number;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'app_auth_token_v1';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<boolean>(true);

  // Wire token to API client
  useEffect(() => {
    setApiAuthTokenGetter(() => token ?? undefined);
  }, [token]);

  // Restore session on mount
  useEffect(() => {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) {
      setToken(existing);
      AuthApi.me()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => setRestoring(false));
    } else {
      setRestoring(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await AuthApi.login({ email, password });
    setToken(res.token);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
  };

  const signup = async (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: number;
  }) => {
    const res = await AuthApi.register(params);
    setToken(res.token);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo(
    () => ({ user, token, restoring, login, logout, signup }),
    [user, token, restoring],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
