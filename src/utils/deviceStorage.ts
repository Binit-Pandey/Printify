/**
 * Device storage utilities for client-side device tracking
 * Mirrors backend device fingerprinting logic
 */

const STORAGE_KEY_DEVICE_ID = 'printpress_device_id';
const STORAGE_KEY_DEVICE_VERIFIED = 'printpress_device_verified';
const STORAGE_KEY_VERIFICATION_TOKEN = 'printpress_verification_token';
const STORAGE_KEY_DEVICE_NAME = 'printpress_device_name';

/**
 * Generate device fingerprint from browser data
 * This is a client-side fingerprint that will be validated by the server
 */
function generateClientDeviceFingerprint(): string {
  // Collect browser data that identifies the device
  const browserData = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency || 0,
    memory: (navigator.deviceMemory as unknown as number) || 0,
    screen: `${window.screen.width}x${window.screen.height}`,
  };

  // Simple hash of browser data
  const dataString = JSON.stringify(browserData);
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 32);
}

/**
 * Get or create device ID
 * First time: generates and stores device ID
 * Subsequent: returns stored device ID
 */
export function getOrCreateDeviceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (stored) {
      console.log('[DEVICE] Using stored device ID:', stored);
      return stored;
    }

    // Generate new device ID for this device
    const deviceId = generateClientDeviceFingerprint();
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId);
    console.log('[DEVICE] Generated new device ID:', deviceId);
    return deviceId;
  } catch (error) {
    console.error('[DEVICE] Failed to get/create device ID:', error);
    // Fallback to generating on the fly if localStorage fails
    return generateClientDeviceFingerprint();
  }
}

/**
 * Store verification token temporarily
 * Token is short-lived (15 minutes) and used for device verification
 */
export function storeVerificationToken(
  token: string,
  expiryMinutes: number = 15
): void {
  try {
    const expiryTime = Date.now() + expiryMinutes * 60 * 1000;
    localStorage.setItem(
      STORAGE_KEY_VERIFICATION_TOKEN,
      JSON.stringify({ token, expiryTime })
    );
    console.log('[DEVICE] Verification token stored');
  } catch (error) {
    console.error('[DEVICE] Failed to store verification token:', error);
  }
}

/**
 * Retrieve and validate verification token
 * Returns null if token doesn't exist or has expired
 */
export function getVerificationToken(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VERIFICATION_TOKEN);
    if (!stored) return null;

    const data = JSON.parse(stored);
    const { token, expiryTime } = data;

    // Check if token has expired
    if (Date.now() > expiryTime) {
      console.log('[DEVICE] Verification token expired');
      localStorage.removeItem(STORAGE_KEY_VERIFICATION_TOKEN);
      return null;
    }

    return token;
  } catch (error) {
    console.error('[DEVICE] Failed to get verification token:', error);
    return null;
  }
}

/**
 * Clear verification token from storage
 */
export function clearVerificationToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_VERIFICATION_TOKEN);
    console.log('[DEVICE] Verification token cleared');
  } catch (error) {
    console.error('[DEVICE] Failed to clear verification token:', error);
  }
}

/**
 * Mark device as verified
 * Stores verification status in localStorage
 */
export function markDeviceAsVerified(deviceId: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_DEVICE_VERIFIED,
      JSON.stringify({
        deviceId,
        verifiedAt: new Date().toISOString(),
      })
    );
    console.log('[DEVICE] Device marked as verified:', deviceId);
  } catch (error) {
    console.error('[DEVICE] Failed to mark device as verified:', error);
  }
}

/**
 * Check if device is marked as verified in localStorage
 * Note: This is for UX only - server is authoritative
 */
export function isDeviceVerifiedLocally(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DEVICE_VERIFIED);
    if (!stored) return false;

    const data = JSON.parse(stored);
    return !!data.deviceId;
  } catch (error) {
    console.error('[DEVICE] Failed to check local verification status:', error);
    return false;
  }
}

/**
 * Clear device verification status (called on logout)
 */
export function clearDeviceVerification(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DEVICE_VERIFIED);
    localStorage.removeItem(STORAGE_KEY_VERIFICATION_TOKEN);
    console.log('[DEVICE] Device verification cleared');
  } catch (error) {
    console.error('[DEVICE] Failed to clear device verification:', error);
  }
}

/**
 * Store device name (for display purposes)
 */
export function storeDeviceName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_NAME, name);
  } catch (error) {
    console.error('[DEVICE] Failed to store device name:', error);
  }
}

/**
 * Get stored device name
 */
export function getDeviceName(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_DEVICE_NAME);
  } catch (error) {
    console.error('[DEVICE] Failed to get device name:', error);
    return null;
  }
}
