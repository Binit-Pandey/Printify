import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, RegisterFormData, LoginFormData, VerificationStatus } from '../types/auth';

const STORAGE_KEY = 'printpress_user';
const API_BASE = '/api'; // Use relative URL to leverage Vite proxy

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  register: (data: RegisterFormData) => Promise<{ success: boolean; message: string }>;
  login: (data: LoginFormData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  getVerificationStatus: (email: string) => Promise<VerificationStatus>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success && result.user) {
        setUser(result.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      } else {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setError(null);
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend verification';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVerificationStatus = useCallback(async (email: string): Promise<VerificationStatus> => {
    try {
      const response = await fetch(`${API_BASE}/auth/verification-status?email=${encodeURIComponent(email)}`);
      return await response.json();
    } catch (err) {
      console.error('Failed to get verification status:', err);
      return { isVerified: false, canResend: false };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        register,
        login,
        logout,
        verifyEmail,
        resendVerification,
        getVerificationStatus,
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
