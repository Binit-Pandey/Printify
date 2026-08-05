import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { api, setAuthToken, TOKEN_KEY } from '../services/api';

const STORAGE_KEY = 'printpress_user';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(loadUser);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.login(username, password);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      localStorage.setItem(TOKEN_KEY, res.token);
      setAuthToken(res.token);
      setUserState(res.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUserState(null);
  }, []);

  const token = loadToken();
  if (token) {
    setAuthToken(token);
  }

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
