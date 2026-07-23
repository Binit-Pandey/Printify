import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_TOKEN = 'printpress_token';
const STORAGE_KEY_USER = 'printpress_user';
const API_BASE_URL = 'http://localhost:3001/api';

function loadUserFromStorage(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const user = localStorage.getItem(STORAGE_KEY_USER);
    return {
      token,
      user: user ? JSON.parse(user) : null,
    };
  } catch {
    return { user: null, token: null };
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user and token on mount
  const initializeAuth = useCallback(() => {
    const { user: savedUser, token: savedToken } = loadUserFromStorage();
    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
    }
  }, []);

  // Initialize auth on first render
  if (!user && !token) {
    initializeAuth();
  }

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Registration failed');
          return false;
        }

        // Save token and user
        localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));

        setUser(data.user);
        setToken(data.token);

        console.log('[AUTH] Registration successful:', email);
        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Registration failed';
        setError(errMsg);
        console.error('[AUTH] Registration error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Login failed');
          return false;
        }

        // Save token and user
        localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));

        setUser(data.user);
        setToken(data.token);

        console.log('[AUTH] Login successful:', email);
        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Login failed';
        setError(errMsg);
        console.error('[AUTH] Login error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
    setToken(null);
    setError(null);
    console.log('[AUTH] Logout successful');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        register,
        login,
        logout,
        clearError,
      }}
    >
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
