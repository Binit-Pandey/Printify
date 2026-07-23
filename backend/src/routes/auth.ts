import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { randomUUID } from 'crypto';

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

export default router;
