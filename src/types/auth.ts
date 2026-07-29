export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  userId?: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  userId?: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  canResend: boolean;
  expiresAt?: string;
}
