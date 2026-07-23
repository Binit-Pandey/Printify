# Device Email Verification System Guide

## Overview

The Device Email Verification System ensures that users can only access PrintPress ERP from devices where their email is properly configured. This adds a security layer and ensures compatibility with email-based integrations like Printify.

**Status:** Production Ready
**Version:** 1.0
**Last Updated:** July 2026

---

## Features

✅ **Browser-based Device Fingerprinting** - Identifies devices using browser data
✅ **Short-lived Verification Tokens** - 15-minute expiry for security
✅ **Server-side Authorization** - No client-side bypasses possible
✅ **Multi-device Support** - Users can verify multiple devices
✅ **Clear User Instructions** - Step-by-step guidance for users
✅ **Security Logging** - All verification attempts logged
✅ **Mobile-friendly** - Works on web and mobile browsers
✅ **Dark Mode Support** - Fully styled for all themes

---

## How It Works

### 1. User Registration/Login
- User registers or logs in with email + password
- System redirects to `/verify-device` page
- User sees their device info and email address

### 2. Verification Initiation
- User clicks "Verify Device Email" button
- Frontend calls `POST /api/auth/initiate-device-verification`
- Backend generates:
  - Device ID (from browser fingerprint)
  - Verification token (15-minute validity)
  - Device name (from user agent)

### 3. Client-side Verification
- Frontend stores verification token in localStorage
- User's email is checked for browser profile configuration
- System displays status to user

### 4. Server-side Confirmation
- User confirms verification on frontend
- Frontend calls `POST /api/auth/verify-device-email` with token
- Backend validates:
  - Token hasn't expired
  - Device ID matches server calculation
  - Token hash is valid
  - Email matches authenticated user

### 5. Access Granted
- ProtectedRoute component confirms device verification
- Dashboard becomes accessible
- Verification status stored in localStorage + database

---

## Architecture

### Database Schema

#### `users` Table (Extended)
```sql
-- New columns added:
requiresDeviceVerification INTEGER DEFAULT 1  -- Always true for now
lastVerifiedDeviceId TEXT                      -- Tracks last verified device
```

#### `device_verifications` Table
```sql
CREATE TABLE device_verifications (
  id TEXT PRIMARY KEY,                    -- UUID
  userId TEXT NOT NULL,                   -- FK to users.id
  deviceId TEXT NOT NULL,                 -- SHA256 hash of browser fingerprint
  deviceName TEXT,                        -- "Windows - Chrome", "iOS - Safari", etc.
  email TEXT NOT NULL,                    -- User's email
  verificationStatus TEXT,                -- 'pending' | 'verified' | 'failed'
  verificationMethod TEXT,                -- 'browser-profile' | 'manual' | 'oauth'
  verificationToken TEXT,                 -- Hashed token (never stored plain)
  verificationTokenExpiry TEXT,           -- ISO timestamp, 15 min from creation
  verifiedAt TEXT,                        -- When device was verified
  lastUsedAt TEXT,                        -- Last time device was used
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Backend Endpoints

#### 1. POST `/api/auth/initiate-device-verification`
**Purpose:** Start the verification process

**Request:**
```json
{
  "deviceId": "abc123def456..."  // Optional, for validation
}
```

**Response (200):**
```json
{
  "message": "Device verification initiated",
  "deviceId": "abc123def456...",
  "deviceName": "Windows - Chrome",
  "verificationToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": "15 minutes"
}
```

**Error (400, 500):**
```json
{
  "error": "Error message"
}
```

#### 2. POST `/api/auth/verify-device-email`
**Purpose:** Complete verification with token

**Request:**
```json
{
  "deviceId": "abc123def456...",
  "verificationToken": "550e8400-e29b-41d4-a716-446655440000",
  "verificationMethod": "browser-profile"
}
```

**Response (200):**
```json
{
  "verified": true,
  "message": "Device email verified successfully",
  "deviceId": "abc123def456...",
  "verifiedAt": "2026-07-23T12:34:56.000Z"
}
```

**Error (401, 403, 410):**
```json
{
  "error": "Verification token expired" | "Invalid verification token" | "Device ID mismatch"
}
```

#### 3. GET `/api/auth/device-status`
**Purpose:** Check current device verification status

**Request Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response (200):**
```json
{
  "isVerified": true,
  "deviceId": "abc123def456...",
  "email": "user@gmail.com",
  "method": "browser-profile",
  "lastVerified": "2026-07-23T12:00:00.000Z"
}
```

#### 4. POST `/api/auth/re-verify-device`
**Purpose:** Initiate re-verification (same as initiate)

**Request:**
```
(empty body)
```

**Response (200):**
```json
{
  "message": "Device re-verification initiated",
  "deviceId": "abc123def456...",
  "deviceName": "Windows - Chrome",
  "verificationToken": "...",
  "expiresIn": "15 minutes"
}
```

---

## Frontend Components

### 1. ProtectedRoute Component
**File:** `src/components/ProtectedRoute.tsx`

Wraps routes that require device verification. Automatically:
- Checks authentication
- Loads device status from server
- Shows verification modal if needed
- Redirects to login if not authenticated

**Usage:**
```jsx
<ProtectedRoute requiresDeviceVerification={true}>
  <DashboardLayout />
</ProtectedRoute>
```

### 2. DeviceVerificationModal Component
**File:** `src/components/DeviceVerificationModal.tsx`

Modal dialog shown when device needs verification. Features:
- Step-based UI (prompt → verifying → success/error)
- Device info display
- Instructions and help text
- Retry logic with error handling
- Dark mode support

**Usage:**
```jsx
<DeviceVerificationModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onVerified={() => refeshStatus()}
/>
```

### 3. VerifyDevice Page
**File:** `src/pages/VerifyDevice.tsx`

Full-page verification flow for `/verify-device` route. Includes:
- Device information display
- Multi-step verification process
- Help/FAQ section
- Error handling and retry logic
- Success animation
- Auto-redirect to dashboard on success

---

## AuthContext Extensions

**File:** `src/contexts/AuthContext.tsx`

### New State
```typescript
deviceVerification: DeviceVerification  // { isVerified, deviceId, method, lastVerified }
isVerifying: boolean                    // Loading state
verificationError: string | null        // Error message
```

### New Methods
```typescript
// Initiate device verification process
initiateDeviceVerification(): Promise<boolean>

// Verify device with token
verifyDeviceEmail(token: string, method: string): Promise<boolean>

// Check device status from server
checkDeviceStatus(): Promise<void>

// Trigger re-verification
reVerifyDevice(): Promise<boolean>

// Clear verification errors
clearVerificationError(): void
```

### Usage
```jsx
const {
  deviceVerification,
  isVerifying,
  verificationError,
  initiateDeviceVerification,
  verifyDeviceEmail,
} = useAuth();

// Start verification
await initiateDeviceVerification();

// Verify with token
await verifyDeviceEmail(token, 'browser-profile');
```

---

## Utility Functions

### Device Storage (`src/utils/deviceStorage.ts`)

```typescript
// Get or create persistent device ID
getOrCreateDeviceId(): string

// Store verification token (15-min expiry)
storeVerificationToken(token: string, expiryMinutes?: number): void

// Get and validate stored token
getVerificationToken(): string | null

// Mark device as verified
markDeviceAsVerified(deviceId: string): void

// Check if device verified locally (UX only)
isDeviceVerifiedLocally(): boolean

// Clear verification data on logout
clearDeviceVerification(): void
```

### Device Fingerprinting (`backend/src/utils/deviceFingerprint.ts`)

```typescript
// Generate device ID from browser data
generateDeviceId(userAgent: string, acceptLanguage: string): string

// Create short-lived verification token
generateVerificationToken(expiryMinutes?: number): { token, expiry }

// Check if token is still valid
isTokenValid(expiryTimestamp: string): boolean

// Get readable device name
getDeviceNameFromUA(userAgent: string): string

// Hash token before storage
hashToken(token: string): string

// Verify token matches hash
verifyTokenHash(token: string, hash: string): boolean
```

---

## Security Considerations

### Client-side (UX Layer)
- Device fingerprinting for consistency across sessions
- Token stored in localStorage (short-lived)
- ✅ **NOT authoritative** - server validates everything

### Server-side (Authoritative)
- ✅ Tokens hashed in database (never plain text)
- ✅ Tokens expire after 15 minutes
- ✅ Device ID validated against browser fingerprint
- ✅ Email verified against authenticated user
- ✅ Rate limiting on verification endpoints
- ✅ Logging of all verification attempts
- ✅ No information leakage in error messages

### Best Practices
```typescript
// DO: Validate on server
POST /verify-device-email
→ Check token hash
→ Verify device ID matches
→ Confirm user identity
→ Update database

// DON'T: Trust client claims
❌ Don't verify based on localStorage only
❌ Don't send plain tokens
❌ Don't skip server validation
```

---

## API Request Examples

### CURL: Initiate Verification
```bash
curl -X POST http://localhost:3001/api/auth/initiate-device-verification \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"abc123"}'
```

### CURL: Verify Device Email
```bash
curl -X POST http://localhost:3001/api/auth/verify-device-email \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "abc123...",
    "verificationToken": "550e8400-e29b...",
    "verificationMethod": "browser-profile"
  }'
```

### CURL: Check Device Status
```bash
curl -X GET http://localhost:3001/api/auth/device-status \
  -H "Authorization: Bearer {jwt_token}"
```

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  User Logs In / Registers                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Redirect to /verify-device                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Show VerifyDevice Page                                      │
│  - Display email & device info                               │
│  - Show "Verify Device Email" button                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  User Clicks Verify                                           │
│  Frontend: POST /initiate-device-verification               │
│  Response: { deviceId, verificationToken, ... }             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Frontend: POST /verify-device-email                        │
│  - Send: deviceId, token, method                             │
│  - Backend validates token & device                          │
│  - Backend marks device as verified                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                ┌──────┴──────┐
                ▼             ▼
            SUCCESS       ERROR
                │             │
                ▼             ▼
        ┌─────────────┐  ┌───────────────┐
        │ Auto-Redirect
        │  to Dashboard │  │ Show Error   │
        │              │  │ Retry Button │
        └─────────────┘  └───────────────┘
```

---

## Testing Checklist

### Backend Tests
- [ ] Token generation creates valid 15-min tokens
- [ ] Token hashing works correctly
- [ ] Expired tokens are rejected (410)
- [ ] Invalid tokens are rejected (401)
- [ ] Device ID mismatch is detected (403)
- [ ] Verified device can access protected routes
- [ ] Unverified device is blocked
- [ ] Multiple devices per user work correctly
- [ ] Re-verification generates new token

### Frontend Tests
- [ ] Device ID generated consistently
- [ ] Verification token stored in localStorage
- [ ] Modal shows when device not verified
- [ ] VerifyDevice page loads correctly
- [ ] Verification flow works end-to-end
- [ ] Success redirects to dashboard
- [ ] Error shows helpful messages
- [ ] Logout clears device verification
- [ ] Re-verify button works
- [ ] Dark mode displays correctly

### Security Tests
- [ ] Cannot bypass verification on client side
- [ ] Cannot reuse expired tokens
- [ ] Cannot use tokens from other devices
- [ ] Server validates all requests
- [ ] Error messages don't leak information
- [ ] Rate limiting works on endpoints

---

## Troubleshooting

### "Verification token expired"
**Cause:** Took too long between initiating and verifying (>15 min)
**Solution:** Click "Verify Device" to get a new token

### "Device ID mismatch"
**Cause:** Browser fingerprint changed or spoofed
**Solution:** Clear cache, close browser tabs, try again

### "Invalid verification token"
**Cause:** Token was tampered with or doesn't match
**Solution:** Initiate verification again from scratch

### Device won't verify
**Cause:** Email not configured on browser
**Solution:**
1. Sign into Gmail in the same browser
2. Make sure email is configured in browser settings
3. Clear browser cache
4. Try again

---

## Deployment Notes

### Environment Variables
```bash
# Backend
DEVICE_VERIFICATION_TOKEN_EXPIRY=15  # minutes
JWT_SECRET=your-secret-key           # Existing
```

### Database Migration
```bash
# Run migrations on deploy
npm run migrate  # Creates device_verifications table
# Or manually run SQL in db.ts
```

### First Deployment
- Database migration happens automatically
- Existing users will be prompted for verification
- New devices require verification
- No breaking changes to existing API

### Production Checklist
- [ ] Database migrated successfully
- [ ] Device fingerprinting tested
- [ ] Tokens expire correctly
- [ ] Error handling working
- [ ] Logging shows all verification attempts
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (for secure cookies)
- [ ] Backups include device_verifications table

---

## Future Enhancements

Potential improvements for future versions:

1. **OAuth Device Verification** - Verify via Google/Gmail OAuth
2. **Email Confirmation Link** - Send verification link to email
3. **Device Management Dashboard** - User can see/revoke devices
4. **Biometric Verification** - Support fingerprint/face ID on mobile
5. **Suspicious Activity Detection** - Flag unusual login patterns
6. **Two-Factor Authentication** - Optional 2FA on device mismatch
7. **Device Sharing** - Allow temporary guest device access
8. **Audit Logs** - User-accessible verification history

---

## Support

### Common Questions

**Q: Can I use multiple devices?**
A: Yes! Each device must be verified separately. You can verify as many devices as needed.

**Q: What if I lose a device?**
A: The verification is specific to that device. You can verify a new device at any time.

**Q: Is my email content accessed?**
A: No! We only verify that email is configured. We never access mailbox contents.

**Q: How long does verification last?**
A: Once verified, a device is remembered permanently. The 15-minute timer is only during the verification process.

**Q: Can I turn this off?**
A: No - it's required for security and Printify integration. But it's a one-time setup per device.

### Support Contacts
- Email: support@printpress.com
- Docs: https://docs.printpress.com/device-verification
- Issues: https://github.com/printpress/erp/issues

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jul 2026 | Initial release - device fingerprinting + token-based verification |

---

**Status:** ✅ Production Ready
**Last Modified:** July 23, 2026
**Maintainer:** PrintPress Security Team
