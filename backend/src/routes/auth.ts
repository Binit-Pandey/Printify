import { Router } from 'express';
import { scryptSync, randomBytes, timingSafeEqual, randomInt } from 'crypto';
import { db } from '../db';
import { wrap } from './wrap';
import { createMockToken, authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { mockUsers, mockUserPassword } from '../mockUsers';
import { sendOtpEmail, sendPasswordResetEmail } from '../email';

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  const derivedKey = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derivedKey.length !== keyBuf.length) return false;
  return timingSafeEqual(derivedKey, keyBuf);
}

function generateId(): string {
  return randomBytes(12).toString('hex');
}

function generateOtp(): string {
  return String(randomInt(1000, 10000));
}

// ── Register Admin (first step: send OTP) ───────────────────────────────────
router.post('/register-admin', wrap(async (req, res) => {
  const { companyName, fullName, email, password, confirmPassword } = req.body;

  if (!companyName || !fullName || !email || !password || !confirmPassword) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare('DELETE FROM email_verification_codes WHERE email = ?').run(email);

  db.prepare(`
    INSERT INTO email_verification_codes (email, code, expires_at, resend_window_start)
    VALUES (?, ?, ?, datetime('now'))
  `).run(email, code, expiresAt);

  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    return;
  }

  res.json({ message: 'Verification code sent to email', email });
}));

// ── Verify OTP ──────────────────────────────────────────────────────────────
router.post('/verify-otp', wrap(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400).json({ error: 'Email and code are required' });
    return;
  }

  const record = db.prepare(`
    SELECT id, code, expires_at FROM email_verification_codes
    WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1
  `).get(email) as { id: number; code: string; expires_at: string } | undefined;

  if (!record) {
    res.status(400).json({ error: 'No verification code found. Please register again.' });
    return;
  }

  if (new Date(record.expires_at) < new Date()) {
    db.prepare('UPDATE email_verification_codes SET used = 1 WHERE id = ?').run(record.id);
    res.status(400).json({ error: 'Verification code expired. Please register again.' });
    return;
  }

  if (record.code !== code) {
    res.status(400).json({ error: 'Invalid verification code' });
    return;
  }

  db.prepare('UPDATE email_verification_codes SET used = 1 WHERE id = ?').run(record.id);

  res.json({ message: 'Email verified successfully' });
}));

// ── Complete Registration (after OTP verified) ──────────────────────────────
router.post('/complete-registration', wrap(async (req, res) => {
  const { companyName, fullName, email, password } = req.body;

  if (!companyName || !fullName || !email || !password) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const codeRecord = db.prepare(`
    SELECT id FROM email_verification_codes
    WHERE email = ? AND used = 1 ORDER BY id DESC LIMIT 1
  `).get(email);

  if (!codeRecord) {
    res.status(400).json({ error: 'Email not verified. Please verify OTP first.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const id = generateId();
  const passwordHash = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, company_name, full_name, email, password_hash, role, email_verified)
    VALUES (?, ?, ?, ?, ?, 'admin', 1)
  `).run(id, companyName, fullName, email, passwordHash);

  const token = generateId();
  db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(token, id);

  const user = {
    id,
    company_name: companyName,
    full_name: fullName,
    name: fullName,
    email,
    role: 'admin' as const,
    email_verified: true,
  };

  res.json({ user, token });
}));

// ── Resend OTP ──────────────────────────────────────────────────────────────
router.post('/resend-otp', wrap(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const record = db.prepare(`
    SELECT id, resend_count, resend_window_start FROM email_verification_codes
    WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1
  `).get(email) as { id: number; resend_count: number; resend_window_start: string } | undefined;

  if (!record) {
    res.status(400).json({ error: 'No pending verification. Please register again.' });
    return;
  }

  const now = new Date();
  const windowStart = record.resend_window_start ? new Date(record.resend_window_start) : now;

  if (now.getTime() - windowStart.getTime() > 60 * 60 * 1000) {
    db.prepare('UPDATE email_verification_codes SET resend_count = 0, resend_window_start = ? WHERE id = ?')
      .run(now.toISOString(), record.id);
  }

  const currentRecord = db.prepare(`
    SELECT id, resend_count FROM email_verification_codes
    WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1
  `).get(email) as { id: number; resend_count: number };

  if (currentRecord.resend_count >= 3) {
    res.status(429).json({ error: 'Maximum resend limit reached (3 per hour). Please try again later.' });
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE email_verification_codes SET code = ?, expires_at = ?, resend_count = resend_count + 1
    WHERE id = ?
  `).run(code, expiresAt, currentRecord.id);

  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    return;
  }

  res.json({ message: 'New verification code sent' });
}));

// ── Login ───────────────────────────────────────────────────────────────────
router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const row = db.prepare(`
    SELECT id, company_name, full_name, email, username, password_hash, role, email_verified
    FROM users WHERE email = ? OR username = ?
  `).get(username, username) as any;

  if (row) {
    if (!verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateId();
    db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').run(token, row.id);

    const user = {
      id: row.id,
      company_name: row.company_name,
      full_name: row.full_name,
      name: row.full_name,
      email: row.email,
      username: row.username,
      role: row.role,
      email_verified: !!row.email_verified,
    };

    res.json({ user, token });
    return;
  }

  // Hard-coded demo accounts are ONLY available in development (Electron runs
  // the backend with NODE_ENV=production, where a real seeded admin account in
  // the `users` table is required instead).
  const allowMockUsers = process.env.NODE_ENV !== 'production';
  const mockUser = allowMockUsers ? mockUsers.find(u => u.username === username) : undefined;
  if (mockUser && password === mockUserPassword) {
    const token = createMockToken(mockUser);
    res.json({ user: { ...mockUser, company_name: undefined, full_name: mockUser.name }, token });
    return;
  }

  res.status(401).json({ error: 'Invalid credentials' });
}));

// ── Current session ─────────────────────────────────────────────────────────
// Lets the renderer confirm that the token it holds is still accepted, instead
// of guessing from a failed request. Used to tell "this one request was
// rejected" apart from "the whole session is dead".
router.get('/me', authenticate, wrap(async (req: AuthenticatedRequest, res) => {
  const u = req.user!;
  res.json({
    user: {
      id: u.id,
      company_name: u.company_name,
      full_name: u.full_name,
      name: u.name,
      email: u.email,
      username: u.username,
      role: u.role,
      email_verified: !!u.email_verified,
    },
  });
}));

// ── Logout ──────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, wrap(async (req: AuthenticatedRequest, res) => {
  const header = req.headers.authorization ?? '';
  db.prepare('DELETE FROM sessions WHERE id = ?').run(header.slice(7));
  res.json({ message: 'Signed out' });
}));

// ── Change password (signed-in user) ────────────────────────────────────────
// Lets the super admin (and any signed-in user) rotate their own password
// without going through the emailed reset flow, which needs SMTP to be working
// and unlocked. The current password must be supplied so a borrowed session
// cannot take the account over.
router.post('/change-password', authenticate, wrap(async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required' });
    return;
  }
  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    res.status(400).json({ error: 'New passwords do not match' });
    return;
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  if (newPassword.length > 200) {
    res.status(400).json({ error: 'Password is too long' });
    return;
  }
  if (newPassword === currentPassword) {
    res.status(400).json({ error: 'New password must be different from the current one' });
    return;
  }

  const row = db.prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .get(req.user!.id) as { id: string; password_hash: string } | undefined;
  if (!row || !row.password_hash) {
    // A mock/seeded session has no stored hash to check against.
    res.status(400).json({ error: 'This account has no password set. Use the reset flow instead.' });
    return;
  }

  if (!verifyPassword(currentPassword, row.password_hash)) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), row.id);

  // Sign out every other device, then keep this one signed in so the admin is
  // not logged out of the app they are changing the password in.
  const currentToken = (req.headers.authorization ?? '').slice(7);
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(row.id, currentToken);

  res.json({ message: 'Password changed successfully', reauthenticate: currentToken === '' });
}));

// ── Forgot password ─────────────────────────────────────────────────────────
router.post('/forgot-password', wrap(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;

  // Always return the same message whether or not the account exists,
  // to avoid revealing which emails are registered.
  if (!user) {
    res.json({ message: 'If that email is registered, a password reset code has been sent to it.' });
    return;
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare('DELETE FROM password_reset_codes WHERE email = ?').run(email);
  db.prepare(`
    INSERT INTO password_reset_codes (email, code, expires_at)
    VALUES (?, ?, ?)
  `).run(email, code, expiresAt);

  try {
    await sendPasswordResetEmail(email, code);
  } catch (err) {
    console.error('Failed to send password reset email:', err);
  }

  res.json({ message: 'If that email is registered, a password reset code has been sent to it.' });
}));

// ── Reset password ──────────────────────────────────────────────────────────
router.post('/reset-password', wrap(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    res.status(400).json({ error: 'Email, code, and new password are required' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (!user) {
    res.status(400).json({ error: 'Invalid or expired reset code' });
    return;
  }

  const record = db.prepare(`
    SELECT id, code, expires_at FROM password_reset_codes
    WHERE email = ? AND used = 0 ORDER BY id DESC LIMIT 1
  `).get(email) as { id: number; code: string; expires_at: string } | undefined;

  if (!record) {
    res.status(400).json({ error: 'Invalid or expired reset code' });
    return;
  }

  if (new Date(record.expires_at) < new Date()) {
    db.prepare('UPDATE password_reset_codes SET used = 1 WHERE id = ?').run(record.id);
    res.status(400).json({ error: 'Reset code expired. Please request a new one.' });
    return;
  }

  if (record.code !== code) {
    res.status(400).json({ error: 'Invalid reset code' });
    return;
  }

  const passwordHash = hashPassword(newPassword);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
  db.prepare('UPDATE password_reset_codes SET used = 1 WHERE id = ?').run(record.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  res.json({ message: 'Password reset successfully. Please sign in with your new password.' });
}));

export default router;
