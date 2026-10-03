import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { findMockUserById, type MockUser } from '../mockUsers';

interface UserShape {
  id: string;
  company_name?: string;
  full_name?: string;
  email: string;
  username?: string;
  role: string;
  name: string;
  email_verified?: boolean;
  avatar?: string;
  lastLogin?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserShape;
}

const MOCK_TOKENS: Record<string, UserShape> = {};

function createMockToken(user: UserShape): string {
  const token = `mock_${user.id}_${Date.now()}`;
  MOCK_TOKENS[token] = user;
  return token;
}

// Mock tokens are held in process memory, so every backend restart would
// otherwise invalidate a token the renderer still has in localStorage — the
// user stays "logged in" but every API call fails with 401 Invalid token.
// Because the token embeds the user's id, rehydrate it from the demo account
// list instead of forcing a re-login.
//
// SECURITY: this must only ever run in development. Rehydrating from a token
// string alone would let anyone forge `mock_1_<anything>` and be granted
// superadmin, so the check mirrors the one in the login route: demo accounts do
// not exist when NODE_ENV is 'production' (which is how the packaged app runs).
function resolveMockToken(token: string): UserShape | undefined {
  const cached = MOCK_TOKENS[token];
  if (cached) return cached;

  if (process.env.NODE_ENV === 'production') return undefined;

  const parts = token.split('_');
  if (parts.length < 3 || parts[0] !== 'mock') return undefined;
  if (!/^\d+$/.test(parts[2])) return undefined;

  const mock: MockUser | undefined = findMockUserById(parts[1]);
  if (!mock) return undefined;

  const user: UserShape = {
    id: mock.id,
    company_name: undefined,
    full_name: mock.name,
    email: mock.email,
    username: mock.username,
    role: mock.role,
    name: mock.name,
    email_verified: true,
  };
  MOCK_TOKENS[token] = user;
  return user;
}

export { createMockToken };

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = header.slice(7);

  if (token.startsWith('mock_')) {
    const user = resolveMockToken(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.user = user;
    next();
    return;
  }

  const session = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(token) as { user_id: string } | undefined;
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const row = db.prepare('SELECT id, company_name, full_name, email, username, role, email_verified, created_at FROM users WHERE id = ?').get(session.user_id) as any;
  if (!row) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.user = {
    id: row.id,
    company_name: row.company_name,
    full_name: row.full_name,
    email: row.email,
    username: row.username,
    role: row.role,
    name: row.full_name,
    email_verified: !!row.email_verified,
  };

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
