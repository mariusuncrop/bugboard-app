import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { request, tokenStore } from './api';
import type { User } from './types';

interface AuthValue {
  user: User | null;
  /** True while the stored token is being exchanged for a user on first load. */
  restoring: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  // A token alone is enough to restore a session, which is what lets tests log
  // in over the API once and reuse the storage state everywhere.
  useEffect(() => {
    if (!tokenStore.get()) {
      setRestoring(false);
      return;
    }
    request<{ user: User }>('/auth/me')
      .then((response) => setUser(response.user))
      .catch(() => tokenStore.clear())
      .finally(() => setRestoring(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStore.set(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    await request<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, restoring, login, logout }), [user, restoring, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an AuthProvider.');
  return value;
}
