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
const EXP_KEY = 'app_auth_expires_v1';
const USER_KEY = 'app_auth_user_v1';
const EXPIRY_SKEW_MS = 30_000; // 30 seconds

function toEpochMs(exp?: string | number | null): number | null {
  if (exp === undefined || exp === null) return null;
  const asNum = typeof exp === 'string' && /^\d+$/.test(exp) ? Number(exp) : (exp as number);
  let ms: number | null = null;
  if (typeof asNum === 'number' && !Number.isNaN(asNum)) {
    ms = asNum < 1e12 ? asNum * 1000 : asNum;
  } else if (typeof exp === 'string') {
    const parsed = Date.parse(exp);
    ms = Number.isNaN(parsed) ? null : parsed;
  }
  return ms;
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<boolean>(true);

  useEffect(() => {
    setApiAuthTokenGetter(() => token ?? undefined);
  }, [token]);

  useEffect(() => {
    const existing = localStorage.getItem(TOKEN_KEY);
    const expRaw = localStorage.getItem(EXP_KEY);
    if (existing) {
      // If expired, clear immediately (no grace; expire exactly at expMs)
      const expMs = toEpochMs(expRaw);
      // Only clear if past expiry beyond skew tolerance to avoid client clock drift issues
      if (expMs !== null && Date.now() - expMs > EXPIRY_SKEW_MS) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXP_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        setRestoring(false);
        return;
      }

      setApiAuthTokenGetter(() => existing);
      setToken(existing);

      const cachedUserRaw = localStorage.getItem(USER_KEY);
      if (cachedUserRaw && cachedUserRaw !== 'undefined') {
        try {
          const cached = JSON.parse(cachedUserRaw) as UserDto;
          setUser(cached);
        } catch {
          // ignore parse errors
        }
      } else if (cachedUserRaw === 'undefined') {
        // Clean up bad historical value
        localStorage.removeItem(USER_KEY);
      }

      (async () => {
        const maxAttempts = 3;
        let lastErr: any = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const u = await AuthApi.me();
            if (u && typeof u === 'object') {
              setUser(u);
              localStorage.setItem(USER_KEY, JSON.stringify(u));
            }
            // success
            return;
          } catch (err: any) {
            lastErr = err;
            const status = err?.status ?? err?.response?.status;
            // eslint-disable-next-line no-console
            console.warn(`Auth restore attempt ${attempt} failed with status ${status}`);
            // Only retry on 401/403 once or twice to avoid race/propagation delays
            if (attempt < maxAttempts && (status === 401 || status === 403)) {
              await new Promise((r) => setTimeout(r, attempt * 400));
              continue;
            }
            break;
          }
        }
        const status = lastErr?.status ?? lastErr?.response?.status;
        // Do NOT clear on 401/403 here; rely solely on EXP_KEY for expiry-based logout
        // eslint-disable-next-line no-console
        console.warn(
          'Auth restore ultimately failed, keeping token and cached user. Error status:',
          status,
        );
      })()
        .catch(() => {})
        .finally(() => {
          // Mark restore complete only after background refresh concludes
          setRestoring(false);
        });
    } else {
      setRestoring(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await AuthApi.login({ email, password });
    setToken(res.token);
    localStorage.setItem(TOKEN_KEY, res.token);
    // Ensure immediate token availability for follow-up calls in the same tick
    setApiAuthTokenGetter(() => res.token);
    if (res.expiresAt != null) {
      const ms = toEpochMs(res.expiresAt);
      if (ms != null) localStorage.setItem(EXP_KEY, String(ms));
    }
    const maybeUser = (res as any)?.user;
    if (maybeUser) {
      setUser(maybeUser);
      localStorage.setItem(USER_KEY, JSON.stringify(maybeUser));
    } else {
      // Attempt to fetch user profile if not included in login response
      try {
        const u = await AuthApi.me();
        if (u && typeof u === 'object') {
          setUser(u);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        } else {
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
      } catch {
        setUser(null);
        localStorage.removeItem(USER_KEY);
      }
    }
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
    // Ensure immediate token availability for follow-up calls in the same tick
    setApiAuthTokenGetter(() => res.token);
    if (res.expiresAt != null) {
      const ms = toEpochMs(res.expiresAt);
      if (ms != null) localStorage.setItem(EXP_KEY, String(ms));
    }
    const maybeUser = (res as any)?.user;
    if (maybeUser) {
      setUser(maybeUser);
      localStorage.setItem(USER_KEY, JSON.stringify(maybeUser));
    } else {
      // Attempt to fetch user profile if not included in signup response
      try {
        const u = await AuthApi.me();
        if (u && typeof u === 'object') {
          setUser(u);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        } else {
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
      } catch {
        setUser(null);
        localStorage.removeItem(USER_KEY);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXP_KEY);
    localStorage.removeItem(USER_KEY);
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
