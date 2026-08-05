import { Router } from 'express';
import { scryptSync, randomBytes } from 'crypto';
import { db } from '../db';
import { wrap } from './wrap';
import { authenticate, requireAdmin } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function generateId(): string {
  return randomBytes(12).toString('hex');
}

// ── List staff users ────────────────────────────────────────────────────────
router.get('/', wrap(async (_req: AuthenticatedRequest, res) => {
  const rows = db.prepare(`
    SELECT id, username, full_name, email, role, email_verified, created_at
    FROM users WHERE role = 'staff' ORDER BY created_at DESC
  `).all();

  res.json({ users: rows.map((r: any) => ({
    id: r.id,
    username: r.username,
    full_name: r.full_name,
    name: r.full_name,
    email: r.email,
    role: r.role,
    email_verified: !!r.email_verified,
    created_at: r.created_at,
  })) });
}));

// ── Create staff user ───────────────────────────────────────────────────────
router.post('/', wrap(async (_req: AuthenticatedRequest, res) => {
  const { username, fullName, email, password } = _req.body;

  if (!username || !fullName || !email || !password) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    res.status(409).json({ error: 'Email or username already exists' });
    return;
  }

  const id = generateId();
  const passwordHash = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, full_name, email, username, password_hash, role, email_verified)
    VALUES (?, ?, ?, ?, ?, 'staff', 1)
  `).run(id, fullName, email, username, passwordHash);

  const user = {
    id,
    username,
    full_name: fullName,
    name: fullName,
    email,
    role: 'staff' as const,
    email_verified: true,
  };

  res.status(201).json({ user });
}));

export default router;
