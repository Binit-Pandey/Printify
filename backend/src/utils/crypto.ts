import crypto from 'crypto';

/**
 * Generate a secure random token (32 bytes)
 * Returns base64 encoded string
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Hash a token using SHA-256
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Simple password hash using SHA-256 with salt
 * Note: In production, use bcrypt or Argon2
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, useSalt, 100000, 64, 'sha512')
    .toString('hex');
  return { hash, salt: useSalt };
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: newHash } = hashPassword(password, salt);
  return newHash === hash;
}

/**
 * Generate a 6-digit code for alternative verification
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate token expiration (24 hours from now)
 */
export function getTokenExpiration(hoursFromNow: number = 24): string {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hoursFromNow);
  return expiresAt.toISOString();
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Generate a unique ID for database records
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
