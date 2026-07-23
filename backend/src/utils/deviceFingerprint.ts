import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

/**
 * Device fingerprinting utilities
 * Generates consistent device IDs for tracking device verification
 */

/**
 * Generate a hash from device identifying information
 * This is mostly for demonstration - in production, you'd use a more robust solution
 */
function hashDeviceInfo(userAgent: string, acceptLanguage: string): string {
  const combined = `${userAgent}::${acceptLanguage}`;
  return createHash('sha256').update(combined).digest('hex').substring(0, 32);
}

/**
 * Generate or validate a device ID
 * @param userAgent Browser user agent string
 * @param acceptLanguage Browser language preferences
 * @param clientDeviceId Optional device ID from client (for validation)
 * @returns Device ID (server-generated or validated)
 */
export function generateDeviceId(
  userAgent: string,
  acceptLanguage: string,
  clientDeviceId?: string
): string {
  // Server generates device ID from browser fingerprint
  // This ensures consistency across browser sessions on the same device
  const serverGeneratedId = hashDeviceInfo(userAgent || '', acceptLanguage || '');

  // If client provided an ID, validate it matches server calculation
  // This helps detect tampering attempts
  if (clientDeviceId && clientDeviceId !== serverGeneratedId) {
    console.warn('[DEVICE] Device ID mismatch - possible tampering attempt');
    // Still return server version (authoritative)
  }

  return serverGeneratedId;
}

/**
 * Generate a short-lived verification token
 * @param expiryMinutes Token expiry time in minutes (default: 15)
 * @returns Token object with token string and expiry timestamp
 */
export function generateVerificationToken(expiryMinutes: number = 15): {
  token: string;
  expiry: string;
} {
  const token = randomUUID();
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);

  return {
    token,
    expiry: expiryDate.toISOString(),
  };
}

/**
 * Check if a verification token is expired
 * @param expiryTimestamp ISO timestamp of token expiry
 * @returns true if token is still valid, false if expired
 */
export function isTokenValid(expiryTimestamp: string): boolean {
  const expiryDate = new Date(expiryTimestamp);
  const now = new Date();
  return now < expiryDate;
}

/**
 * Get device name from user agent
 * Returns a human-readable device/browser name
 */
export function getDeviceNameFromUA(userAgent: string): string {
  if (!userAgent) return 'Unknown Device';

  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('iPhone')) os = 'iOS';
  else if (userAgent.includes('Android')) os = 'Android';

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Chromium'))
    browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  return `${os} - ${browser}`;
}

/**
 * Hash verification token for storage
 * Only the hash is stored in database, not the token itself
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Compare token with stored hash
 * @param token Plain text token from user
 * @param hash Stored hash from database
 * @returns true if token matches hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return tokenHash === hash;
}
