import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type User = {
  username: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'app_users_v1';
const SESSION_KEY = 'app_session_v1';

type StoredUsers = Record<string, { password: string }>;

function readUsers(): StoredUsers {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUsers(users: StoredUsers) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveSession(username: string | null) {
  if (username) localStorage.setItem(SESSION_KEY, username);
  else localStorage.removeItem(SESSION_KEY);
}

function readSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const existing = readSession();
    if (existing) setUser({ username: existing });
  }, []);

  const login = async (username: string, password: string) => {
    const users = readUsers();
    const entry = users[username];
    await new Promise((r) => setTimeout(r, 400));
    if (!entry || entry.password !== password) {
      throw new Error('Invalid username or password');
    }
    setUser({ username });
    saveSession(username);
  };

  const signup = async (username: string, password: string) => {
    const users = readUsers();
    await new Promise((r) => setTimeout(r, 400));
    if (users[username]) {
      throw new Error('Username already exists');
    }
    users[username] = { password };
    writeUsers(users);
    setUser({ username });
    saveSession(username);
  };

  const logout = () => {
    setUser(null);
    saveSession(null);
  };

  const value = useMemo(() => ({ user, login, logout, signup }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
