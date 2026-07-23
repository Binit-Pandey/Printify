import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  getOrCreateDeviceId,
  storeVerificationToken,
  getVerificationToken,
  clearVerificationToken,
  markDeviceAsVerified,
  isDeviceVerifiedLocally,
  clearDeviceVerification,
  storeDeviceName,
  getDeviceName,
} from '../utils/deviceStorage';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface DeviceVerification {
  isVerified: boolean;
  deviceId: string | null;
  method: string | null;
  lastVerified: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  deviceVerification: DeviceVerification;
  isVerifying: boolean;
  verificationError: string | null;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  initiateDeviceVerification: () => Promise<boolean>;
  verifyDeviceEmail: (verificationToken: string, method: string) => Promise<boolean>;
  checkDeviceStatus: () => Promise<void>;
  reVerifyDevice: () => Promise<boolean>;
  clearVerificationError: () => void;
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
  const [deviceVerification, setDeviceVerification] = useState<DeviceVerification>({
    isVerified: false,
    deviceId: null,
    method: null,
    lastVerified: null,
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Load user and token on mount
  const initializeAuth = useCallback(() => {
    const { user: savedUser, token: savedToken } = loadUserFromStorage();
    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
      // Check device verification status after auth is loaded
      checkDeviceStatus();
    }
  }, []);

  // Initialize auth on first render
  useEffect(() => {
    if (!user && !token) {
      initializeAuth();
    }
  }, []);

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
    clearDeviceVerification();
    setUser(null);
    setToken(null);
    setError(null);
    setDeviceVerification({
      isVerified: false,
      deviceId: null,
      method: null,
      lastVerified: null,
    });
    console.log('[AUTH] Logout successful');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearVerificationError = useCallback(() => {
    setVerificationError(null);
  }, []);

  /**
   * Initiate device verification process
   * Generates verification token and stores locally
   */
  const initiateDeviceVerification = useCallback(async (): Promise<boolean> => {
    if (!token || !user) {
      setVerificationError('Not authenticated');
      return false;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const deviceId = getOrCreateDeviceId();

      const response = await fetch(`${API_BASE_URL}/auth/initiate-device-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerificationError(data.error || 'Failed to initiate device verification');
        return false;
      }

      // Store verification token and device info locally
      storeVerificationToken(data.verificationToken);
      storeDeviceName(data.deviceName);

      console.log('[AUTH] Device verification initiated:', data.deviceName);
      return true;
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to initiate device verification';
      setVerificationError(errMsg);
      console.error('[AUTH] Initiate device verification error:', err);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [token, user]);

  /**
   * Verify device email
   * Validates the verification token and marks device as verified
   */
  const verifyDeviceEmail = useCallback(
    async (verificationToken: string, method: string = 'browser-profile'): Promise<boolean> => {
      if (!token || !user) {
        setVerificationError('Not authenticated');
        return false;
      }

      setIsVerifying(true);
      setVerificationError(null);

      try {
        const deviceId = getOrCreateDeviceId();

        const response = await fetch(`${API_BASE_URL}/auth/verify-device-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceId,
            verificationToken,
            verificationMethod: method,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setVerificationError(data.error || 'Device verification failed');
          return false;
        }

        // Mark device as verified locally and on server
        markDeviceAsVerified(deviceId);
        clearVerificationToken();

        // Update device verification state
        setDeviceVerification({
          isVerified: true,
          deviceId,
          method,
          lastVerified: data.verifiedAt,
        });

        console.log('[AUTH] Device email verified successfully');
        return true;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Device verification failed';
        setVerificationError(errMsg);
        console.error('[AUTH] Verify device email error:', err);
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [token, user]
  );

  /**
   * Check device verification status on server
   * Called after login to determine if verification is needed
   */
  const checkDeviceStatus = useCallback(async (): Promise<void> => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/device-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn('[AUTH] Failed to check device status');
        return;
      }

      const data = await response.json();

      setDeviceVerification({
        isVerified: data.isVerified,
        deviceId: data.deviceId,
        method: data.method,
        lastVerified: data.lastVerified,
      });

      console.log('[AUTH] Device status checked:', data);
    } catch (err) {
      console.error('[AUTH] Check device status error:', err);
    }
  }, [token]);

  /**
   * Re-verify device (trigger new verification flow)
   */
  const reVerifyDevice = useCallback(async (): Promise<boolean> => {
    if (!token || !user) {
      setVerificationError('Not authenticated');
      return false;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/re-verify-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setVerificationError(data.error || 'Failed to re-verify device');
        return false;
      }

      // Store new verification token
      storeVerificationToken(data.verificationToken);
      storeDeviceName(data.deviceName);

      console.log('[AUTH] Device re-verification initiated');
      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to re-verify device';
      setVerificationError(errMsg);
      console.error('[AUTH] Re-verify device error:', err);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [token, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        deviceVerification,
        isVerifying,
        verificationError,
        register,
        login,
        logout,
        clearError,
        initiateDeviceVerification,
        verifyDeviceEmail,
        checkDeviceStatus,
        reVerifyDevice,
        clearVerificationError,
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
