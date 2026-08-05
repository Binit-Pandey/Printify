import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

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

export { createMockToken };

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = header.slice(7);

  if (token.startsWith('mock_')) {
    const user = MOCK_TOKENS[token];
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
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
