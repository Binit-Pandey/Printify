import type { Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import type { AuthenticatedRequest } from './auth';

/**
 * Guard for the SMTP credentials held in the `settings` table.
 *
 * The SMTP app password is the most sensitive value in this application: it is
 * a real mailbox credential. It must not be readable or editable by merely
 * being signed in as an admin, so these fields stay behind a separate
 * verification step.
 *
 * A successful check grants a short-lived, per-user unlock. Nothing is written
 * to disk, and the unlock expires on its own so a forgotten unlocked session
 * cannot expose the credentials indefinitely.
 */

const DEFAULT_UNLOCK_TOKEN = 'likePrime@!@#1';
const UNLOCK_TTL_MS = 30 * 60 * 1000;

function resolveToken(): string {
  return process.env.PRINTPRESS_SMTP_UNLOCK_TOKEN || DEFAULT_UNLOCK_TOKEN;
}

function safeEquals(a: string, b: string): boolean {
  // Hashing first means timingSafeEqual never sees mismatched lengths, so the
  // comparison cannot leak the expected token's length.
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();
  return timingSafeEqual(digest(a), digest(b));
}

const unlockedUntil = new Map<string, number>();

export function grantSmtpUnlock(userId: string): void {
  unlockedUntil.set(userId, Date.now() + UNLOCK_TTL_MS);
}

export function revokeSmtpUnlock(userId: string): void {
  unlockedUntil.delete(userId);
}

export function hasSmtpUnlock(userId: string | undefined): boolean {
  if (!userId) return false;
  const until = unlockedUntil.get(userId);
  if (!until) return false;
  if (Date.now() > until) {
    unlockedUntil.delete(userId);
    return false;
  }
  return true;
}

/** Rate-limits failed verification attempts per client. */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

function attemptState(key: string): { count: number; resetAt: number } {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(key, fresh);
    return fresh;
  }
  return entry;
}

export function verifySmtpToken(token: unknown): boolean {
  if (typeof token !== 'string' || token.length === 0) return false;
  return safeEquals(token, resolveToken());
}

/** Body-parser guard: 429s after too many wrong tokens, then compares. */
export function checkSmtpToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const key = String(req.user?.id ?? req.ip ?? 'unknown');
  const state = attemptState(key);
  if (state.count >= MAX_ATTEMPTS) {
    res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    return;
  }
  if (!verifySmtpToken(req.body?.token)) {
    state.count += 1;
    res.status(403).json({ error: 'Incorrect verification token' });
    return;
  }
  attempts.delete(key);
  next();
}

/** Requires a granted unlock; use after `authenticate` + `requireAdmin`. */
export function requireSmtpUnlock(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!hasSmtpUnlock(req.user?.id)) {
    res.status(403).json({ error: 'SMTP settings are locked' });
    return;
  }
  next();
}

export const SMTP_FIELDS = [
  'smtpHost',
  'smtpPort',
  'smtpSecure',
  'smtpUser',
  'smtpPass',
  'smtpFrom',
] as const;

/** Drops SMTP secrets from a settings row when the caller is not unlocked. */
/** Strips SMTP keys from an incoming body so a locked caller cannot overwrite them. */
export function stripSmtp<T extends Record<string, unknown>>(body: T): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...body };
  for (const field of SMTP_FIELDS) delete copy[field];
  return copy;
}
