import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { api, setAuthToken, getAuthToken, TOKEN_KEY, USER_KEY, SESSION_EXPIRED_EVENT } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(loadUser);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.login(username, password);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setAuthToken(res.token);
      setUserState(res.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUserState(null);
  }, []);

  // Seed the token cache from storage on mount. This used to run during render,
  // which is a side effect in a phase React may replay or discard; as an effect
  // it runs exactly once per mount.
  useEffect(() => {
    setAuthToken(getAuthToken());
  }, []);

  // A cached user whose token the backend no longer accepts (session removed,
  // database reset, backend restarted against a different file) would render
  // the whole app as signed in while every request fails. Ask the backend who
  // the token belongs to and drop the cached identity if it disagrees.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const { user: fresh } = await api.auth.me();
        if (cancelled) return;
        // The server is authoritative about the role, so a stale cache can no
        // longer gate (or unlock) the wrong parts of the UI.
        if (fresh && fresh.id !== user.id) {
          logout();
          return;
        }
        if (fresh && fresh.role !== user.role) {
          localStorage.setItem(USER_KEY, JSON.stringify(fresh));
          setUserState(fresh);
        }
      } catch {
        // api.ts already handled an invalid token, and an unreachable backend
        // must not sign the user out — keep the cached session and let the
        // next successful request confirm it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, logout]);

  // The backend has confirmed the session is dead. Clear every trace of it so
  // the app cannot render a signed-in shell around a missing token.
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};