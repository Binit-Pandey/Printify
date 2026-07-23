import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { randomUUID } from 'crypto';
import {
  generateDeviceId,
  generateVerificationToken,
  isTokenValid,
  getDeviceNameFromUA,
  hashToken,
  verifyTokenHash,
} from '../utils/deviceFingerprint';

const router = Router();

// Secret key for JWT signing — in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRY = '7d';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuthRequest extends Request {
  body: {
    email?: string;
    password?: string;
    displayName?: string;
    deviceId?: string;
    verificationToken?: string;
    verificationMethod?: string;
  };
}

interface TokenPayload {
  id: string;
  email: string;
  displayName: string;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

/** Extracts and validates JWT token from Authorization header */
export const authenticateToken = (req: AuthRequest, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: jwt.VerifyErrors | null, decoded: any) => {
    if (err) {
      console.error('[AUTH] Token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = decoded;
    next();
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new user with email, password, and display name
 */
router.post('/register', (req: AuthRequest, res: Response) => {
  const { email, password, displayName } = req.body;

  // Validation
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Email, password, and display name are required' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Password strength validation (minimum 8 chars, at least one uppercase, one number)
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters with at least one uppercase letter and one number',
    });
  }

  try {
    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = randomUUID();
    const now = new Date().toISOString();

    // Insert user into database
    const stmt = db.prepare(`
      INSERT INTO users (id, email, passwordHash, displayName, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, email, passwordHash, displayName, now, now);

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, displayName } as TokenPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log(`[AUTH] User registered: ${email}`);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, email, displayName },
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
router.post('/login', (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = db
      .prepare('SELECT id, email, displayName, passwordHash FROM users WHERE email = ?')
      .get(email) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare passwords
    const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, displayName: user.displayName } as TokenPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log(`[AUTH] User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires valid token)
 */
router.get('/me', authenticateToken, (_req: AuthRequest, res: Response) => {
  res.json({ user: (_req as any).user });
});

/**
 * POST /api/auth/logout
 * Logout user (mainly for frontend cleanup)
 */
router.post('/logout', authenticateToken, (_req: AuthRequest, res: Response) => {
  console.log(`[AUTH] User logged out: ${(_req as any).user.email}`);
  res.json({ message: 'Logout successful' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Device Verification Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/initiate-device-verification
 * Start device verification process - generates verification token
 * Requires: valid JWT token
 */
router.post(
  '/initiate-device-verification',
  authenticateToken,
  (req: AuthRequest, res: Response) => {
    const user = (req as any).user;
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const clientDeviceId = req.body.deviceId || '';

    try {
      // Generate server-side device ID from browser fingerprint
      const deviceId = generateDeviceId(userAgent, acceptLanguage, clientDeviceId);
      const deviceName = getDeviceNameFromUA(userAgent);

      // Generate short-lived verification token (15 minutes)
      const { token: verificationToken, expiry: tokenExpiry } =
        generateVerificationToken(15);

      // Hash token before storing (never store plain tokens)
      const tokenHash = hashToken(verificationToken);

      // Check if this device already has a verification record
      const existingDeviceRecord = db
        .prepare('SELECT id FROM device_verifications WHERE userId = ? AND deviceId = ?')
        .get(user.id, deviceId) as any;

      if (existingDeviceRecord) {
        // Update existing record with new token
        db.prepare(`
          UPDATE device_verifications
          SET verificationStatus = ?, verificationToken = ?, verificationTokenExpiry = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          'pending',
          tokenHash,
          tokenExpiry,
          new Date().toISOString(),
          existingDeviceRecord.id
        );
      } else {
        // Create new device verification record
        const verificationId = randomUUID();
        db.prepare(`
          INSERT INTO device_verifications
          (id, userId, deviceId, deviceName, email, verificationStatus, verificationMethod, verificationToken, verificationTokenExpiry, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          verificationId,
          user.id,
          deviceId,
          deviceName,
          user.email,
          'pending',
          'browser-profile',
          tokenHash,
          tokenExpiry,
          new Date().toISOString(),
          new Date().toISOString()
        );
      }

      console.log(
        `[DEVICE] Verification initiated for user ${user.email} on device ${deviceId}`
      );

      res.json({
        message: 'Device verification initiated',
        deviceId,
        deviceName,
        verificationToken, // Send token to client for verification
        expiresIn: '15 minutes',
      });
    } catch (error) {
      console.error('[DEVICE] Initiate verification error:', error);
      res.status(500).json({ error: 'Failed to initiate device verification' });
    }
  }
);

/**
 * POST /api/auth/verify-device-email
 * Verify that email is connected on this device
 * Requires: valid JWT token + verification token
 */
router.post(
  '/verify-device-email',
  authenticateToken,
  (req: AuthRequest, res: Response) => {
    const user = (req as any).user;
    const { deviceId, verificationToken, verificationMethod } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';

    if (!deviceId || !verificationToken) {
      return res.status(400).json({
        error: 'deviceId and verificationToken are required',
      });
    }

    try {
      // Validate device ID matches current device
      const serverDeviceId = generateDeviceId(userAgent, acceptLanguage);
      if (deviceId !== serverDeviceId) {
        console.warn(
          `[DEVICE] Device ID mismatch for user ${user.email}: ${deviceId} vs ${serverDeviceId}`
        );
        return res.status(403).json({
          error: 'Device ID mismatch - verification failed',
        });
      }

      // Find the device verification record
      const deviceRecord = db
        .prepare(
          `SELECT * FROM device_verifications 
         WHERE userId = ? AND deviceId = ? 
         ORDER BY createdAt DESC LIMIT 1`
        )
        .get(user.id, deviceId) as any;

      if (!deviceRecord) {
        return res.status(404).json({
          error: 'Device verification record not found',
        });
      }

      // Check if token has expired
      if (!isTokenValid(deviceRecord.verificationTokenExpiry)) {
        return res.status(410).json({
          error: 'Verification token expired - please initiate verification again',
        });
      }

      // Verify token matches stored hash
      if (!verifyTokenHash(verificationToken, deviceRecord.verificationToken)) {
        console.warn(`[DEVICE] Invalid verification token for user ${user.email}`);
        return res.status(401).json({
          error: 'Invalid verification token',
        });
      }

      // Email matches authenticated user (guaranteed by JWT)
      // Mark device as verified
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE device_verifications
        SET verificationStatus = ?, verifiedAt = ?, verificationMethod = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        'verified',
        now,
        verificationMethod || 'browser-profile',
        now,
        deviceRecord.id
      );

      // Update user's lastVerifiedDeviceId
      db.prepare(`
        UPDATE users
        SET lastVerifiedDeviceId = ?, updatedAt = ?
        WHERE id = ?
      `).run(deviceId, now, user.id);

      console.log(
        `[DEVICE] Device verified for user ${user.email}: ${deviceId}`
      );

      res.json({
        verified: true,
        message: 'Device email verified successfully',
        deviceId,
        verifiedAt: now,
      });
    } catch (error) {
      console.error('[DEVICE] Verify device error:', error);
      res.status(500).json({ error: 'Device verification failed' });
    }
  }
);

/**
 * GET /api/auth/device-status
 * Check if current device is verified for authenticated user
 * Requires: valid JWT token
 */
router.get('/device-status', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = (req as any).user;
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';

  try {
    const deviceId = generateDeviceId(userAgent, acceptLanguage);

    // Check device verification status
    const deviceRecord = db
      .prepare(
        `SELECT * FROM device_verifications 
       WHERE userId = ? AND deviceId = ? AND verificationStatus = ? 
       ORDER BY createdAt DESC LIMIT 1`
      )
      .get(user.id, deviceId, 'verified') as any;

    if (deviceRecord) {
      res.json({
        isVerified: true,
        deviceId,
        email: user.email,
        method: deviceRecord.verificationMethod,
        lastVerified: deviceRecord.verifiedAt,
      });
    } else {
      res.json({
        isVerified: false,
        deviceId,
        email: user.email,
        method: null,
        lastVerified: null,
      });
    }
  } catch (error) {
    console.error('[DEVICE] Get device status error:', error);
    res.status(500).json({ error: 'Failed to check device status' });
  }
});

/**
 * POST /api/auth/re-verify-device
 * Trigger re-verification of current device (same as initiate)
 * Requires: valid JWT token
 */
router.post(
  '/re-verify-device',
  authenticateToken,
  (req: AuthRequest, res: Response) => {
    const user = (req as any).user;
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';

    try {
      const deviceId = generateDeviceId(userAgent, acceptLanguage);
      const deviceName = getDeviceNameFromUA(userAgent);

      // Generate new verification token
      const { token: verificationToken, expiry: tokenExpiry } =
        generateVerificationToken(15);
      const tokenHash = hashToken(verificationToken);

      // Update or create device verification record
      const existingRecord = db
        .prepare(
          `SELECT id FROM device_verifications 
         WHERE userId = ? AND deviceId = ? 
         ORDER BY createdAt DESC LIMIT 1`
        )
        .get(user.id, deviceId) as any;

      const now = new Date().toISOString();

      if (existingRecord) {
        db.prepare(`
          UPDATE device_verifications
          SET verificationStatus = ?, verificationToken = ?, verificationTokenExpiry = ?, updatedAt = ?
          WHERE id = ?
        `).run('pending', tokenHash, tokenExpiry, now, existingRecord.id);
      } else {
        const verificationId = randomUUID();
        db.prepare(`
          INSERT INTO device_verifications
          (id, userId, deviceId, deviceName, email, verificationStatus, verificationMethod, verificationToken, verificationTokenExpiry, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          verificationId,
          user.id,
          deviceId,
          deviceName,
          user.email,
          'pending',
          'browser-profile',
          tokenHash,
          tokenExpiry,
          now,
          now
        );
      }

      console.log(
        `[DEVICE] Re-verification initiated for user ${user.email} on device ${deviceId}`
      );

      res.json({
        message: 'Device re-verification initiated',
        deviceId,
        deviceName,
        verificationToken,
        expiresIn: '15 minutes',
      });
    } catch (error) {
      console.error('[DEVICE] Re-verify device error:', error);
      res.status(500).json({ error: 'Failed to re-verify device' });
    }
  }
);

export default router;
