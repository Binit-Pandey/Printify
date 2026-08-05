import { Router } from 'express';
import { scryptSync, randomBytes, timingSafeEqual, randomInt } from 'crypto';
import { db } from '../db';
import { wrap } from './wrap';
import { createMockToken } from '../middleware/auth';

const mockUsers = [
  { id: '1', username: 'superadmin', role: 'superadmin' as const, name: 'Super Admin', email: 'super@printpress.com' },
  { id: '2', username: 'admin', role: 'admin' as const, name: 'Admin User', email: 'admin@printpress.com' },
  { id: '3', username: 'staff', role: 'staff' as const, name: 'Staff User', email: 'staff@printpress.com' },
];

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

  console.log(`📧 [OTP] Verification code for ${email}: ${code}`);

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

  console.log(`📧 [OTP Resend] Verification code for ${email}: ${code}`);

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

  const mockUser = mockUsers.find(u => u.username === username);
  if (mockUser && password === 'admin123') {
    const token = createMockToken(mockUser);
    res.json({ user: { ...mockUser, company_name: undefined, full_name: mockUser.name }, token });
    return;
  }

  res.status(401).json({ error: 'Invalid credentials' });
}));

export default router;
