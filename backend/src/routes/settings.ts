import { Router, type Response } from 'express';
import express from 'express';
import { db, DB_PATH, initDatabase, replaceDatabase } from '../db';
import { wrap } from './wrap';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import {
  checkSmtpToken,
  grantSmtpUnlock,
  hasSmtpUnlock,
  requireSmtpUnlock,
  revokeSmtpUnlock,
  stripSmtp,
} from '../middleware/smtpUnlock';
import { sendTestEmail } from '../email';

// `wrap` is typed against the plain express Request; routes that read
// `req.user` after `authenticate` need the augmented shape.
const wrapAuth = (fn: (req: AuthenticatedRequest, res: Response) => any) =>
  wrap(fn as unknown as Parameters<typeof wrap>[0]);

const router = Router();

// The logo is stored inline as a data URL so the value travels with the
// settings record and works offline in the packaged app. Guard it so the column
// cannot be filled with an oversized or non-image payload.
const MAX_LOGO_CHARS = 2 * 1024 * 1024;

function normalizeLogo(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  if (value.length > MAX_LOGO_CHARS) {
    throw Object.assign(new Error('Logo image is too large'), { status: 413 });
  }
  if (value.startsWith('data:image/')) {
    if (!/^data:image\/(png|jpe?g|webp|svg\+xml|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) {
      throw Object.assign(new Error('Logo must be a base64-encoded image'), { status: 400 });
    }
    return value;
  }
  // Anything else is treated as an external URL or path.
  if (!/^(https?:\/\/|\/)/.test(value)) {
    throw Object.assign(new Error('Logo must be an uploaded image or a URL'), { status: 400 });
  }
  return value;
}

router.use(authenticate);

router.use(authenticate);

// Company settings are readable by any signed-in user, but the SMTP block is a
// separate secret and is redacted unless the caller has verified the unlock token.
router.get('/', wrapAuth((req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE id=1').get();
  if (!row) return res.status(404).json({ error: 'Settings not found' });

  const unlocked = hasSmtpUnlock(req.user?.id);
  const record = row as Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, smtpPass, ...rest } = record;

  res.json({
    ...rest,
    // Never send the stored secret to a locked caller.
    ...(unlocked ? { smtpPass } : {}),
    smtpConfigured: Boolean(record.smtpUser && record.smtpPass),
    smtpUnlocked: unlocked,
  });
}));

// Everything below requires an admin account.
router.use(requireAdmin);

// Exchange the verification token for a short-lived SMTP unlock.
router.post('/smtp/unlock', checkSmtpToken, wrapAuth((req, res) => {
  grantSmtpUnlock(req.user!.id);
  res.json({ smtpUnlocked: true });
}));

router.post('/smtp/lock', wrapAuth((req, res) => {
  revokeSmtpUnlock(req.user!.id);
  res.json({ smtpUnlocked: false });
}));

router.post('/test-email', requireSmtpUnlock, wrap(async (req, res) => {
  const { to } = req.body || {};
  if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: 'A valid recipient email is required' });
    return;
  }
  try {
    await sendTestEmail(to);
    res.json({ message: 'Test email sent successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message.split('\n')[0] : 'Failed to send test email';
    res.status(500).json({ error: message });
  }
}));

router.put('/', wrapAuth((req, res) => {
  const existing = db.prepare('SELECT * FROM settings WHERE id=1').get() as Record<string, unknown> | undefined;
  const unlocked = hasSmtpUnlock(req.user?.id);

  // A locked caller must not be able to clear the stored SMTP config by
  // submitting the rest of the settings form without those fields.
  const incoming = (unlocked ? req.body : stripSmtp(req.body ?? {})) as Record<string, unknown>;
  const s = { ...existing, ...incoming };
  const row = {
    name: s.name ?? null,
    panNumber: s.panNumber ?? null,
    vatNumber: s.vatNumber ?? null,
    address: s.address ?? null,
    contactNumber: s.contactNumber ?? null,
    email: s.email ?? null,
    logo: normalizeLogo(s.logo),
    vatRate: s.vatRate ?? null,
    staffExpenseEdit: s.staffExpenseEdit ? 1 : 0,
    smtpHost: s.smtpHost ?? null,
    smtpPort: s.smtpPort != null && s.smtpPort !== '' ? Number(s.smtpPort) : null,
    smtpSecure: s.smtpSecure ? 1 : 0,
    smtpUser: s.smtpUser ?? null,
    smtpPass: s.smtpPass ?? null,
    smtpFrom: s.smtpFrom ?? null,
  };
  db.prepare(`
    UPDATE settings SET name=@name, panNumber=@panNumber, vatNumber=@vatNumber,
      address=@address, contactNumber=@contactNumber, email=@email,
      logo=@logo, vatRate=@vatRate, staffExpenseEdit=@staffExpenseEdit,
      smtpHost=@smtpHost, smtpPort=@smtpPort, smtpSecure=@smtpSecure,
      smtpUser=@smtpUser, smtpPass=@smtpPass, smtpFrom=@smtpFrom
    WHERE id=1
  `).run(row);

  const { smtpPass, ...safe } = row;
  res.json({ ...safe, smtpConfigured: Boolean(row.smtpUser && row.smtpPass), smtpUnlocked: unlocked, ...(unlocked ? { smtpPass } : {}) });
}));

router.get('/export', wrap((_req, res) => {
  const customers = db.prepare('SELECT * FROM customers').all();
  const inventory = db.prepare('SELECT * FROM inventory').all();
  const vendors = db.prepare('SELECT * FROM vendors').all();
  const vendorPayments = db.prepare('SELECT * FROM vendor_payments').all();
  const expenses = db.prepare('SELECT * FROM expenses').all();
  const bills = db.prepare('SELECT * FROM bills').all();
  const settings = db.prepare('SELECT * FROM settings WHERE id=1').get();

  res.json({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    customers,
    inventory,
    vendors,
    vendorPayments,
    expenses,
    bills,
    settings: settings || {},
  });
}));

router.post('/import', wrap((req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Invalid import data' });
    return;
  }

  const importAll = db.transaction(() => {
    db.prepare('DELETE FROM vendor_payments').run();
    db.prepare('DELETE FROM bills').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM inventory').run();
    db.prepare('DELETE FROM vendors').run();
    db.prepare('DELETE FROM customers').run();

    // Settings are only replaced when the backup actually carries them.
    // A data-only backup (customers/inventory/bills/...) must not wipe the
    // company profile, logo, tax details or SMTP configuration.
    const settingsBackup = data.settings && typeof data.settings === 'object' ? data.settings as Record<string, unknown> : null;
    const replaceSettings = settingsBackup !== null && Object.keys(settingsBackup).length > 0;
    if (replaceSettings) {
      db.prepare('DELETE FROM settings').run();
    }

    // Backups exported by older versions may be missing columns that the INSERT
    // below names, and better-sqlite3 throws on an unnamed placeholder. Fill
    // every field so a partial backup still imports cleanly.
    if (Array.isArray(data.customers)) {
      const ins = db.prepare('INSERT INTO customers (id, name, phone, address, email) VALUES (@id, @name, @phone, @address, @email)');
      for (const raw of data.customers) {
        const c = raw as Record<string, unknown>;
        ins.run({ id: c.id, name: c.name ?? '', phone: c.phone ?? '', address: c.address ?? '', email: c.email ?? '' });
      }
    }
    if (Array.isArray(data.inventory)) {
      const ins = db.prepare('INSERT INTO inventory (id, name, category, unit, quantity, purchasePrice, vendor, status) VALUES (@id, @name, @category, @unit, @quantity, @purchasePrice, @vendor, @status)');
      for (const raw of data.inventory) {
        const i = raw as Record<string, unknown>;
        const qty = Number(i.quantity ?? 0) || 0;
        ins.run({
          id: i.id, name: i.name ?? '', category: i.category ?? '', unit: i.unit ?? '',
          quantity: qty, purchasePrice: Number(i.purchasePrice ?? 0) || 0,
          vendor: i.vendor ?? '',
          status: i.status || (qty > 20 ? 'In Stock' : qty > 0 ? 'Low Stock' : 'Out of Stock'),
        });
      }
    }
    if (Array.isArray(data.vendors)) {
      const ins = db.prepare('INSERT INTO vendors (id, name, phone, address, panNumber, outstandingBalance) VALUES (@id, @name, @phone, @address, @panNumber, @outstandingBalance)');
      for (const raw of data.vendors) {
        const v = raw as Record<string, unknown>;
        ins.run({
          id: v.id, name: v.name ?? '', phone: v.phone ?? '',
          address: v.address ?? '', panNumber: v.panNumber ?? '',
          outstandingBalance: Number(v.outstandingBalance ?? 0) || 0,
        });
      }
    }
    if (Array.isArray(data.vendorPayments)) {
      const ins = db.prepare('INSERT INTO vendor_payments (id, vendorId, amount, date, type, description, dueDate) VALUES (@id, @vendorId, @amount, @date, @type, @description, @dueDate)');
      for (const raw of data.vendorPayments) {
        const p = raw as Record<string, unknown>;
        ins.run({
          id: p.id, vendorId: p.vendorId, amount: Number(p.amount ?? 0) || 0,
          date: p.date ?? new Date().toISOString().slice(0, 10),
          type: p.type || 'payment', description: p.description ?? '', dueDate: p.dueDate || null,
        });
      }
    }
    if (Array.isArray(data.expenses)) {
      const ins = db.prepare('INSERT INTO expenses (id, category, amount, reason, date, addedBy) VALUES (@id, @category, @amount, @reason, @date, @addedBy)');
      for (const raw of data.expenses) {
        const e = raw as Record<string, unknown>;
        ins.run({
          id: e.id, category: e.category ?? '', amount: Number(e.amount ?? 0) || 0,
          reason: e.reason ?? '', date: e.date ?? new Date().toISOString().slice(0, 10), addedBy: e.addedBy ?? '',
        });
      }
    }
    if (Array.isArray(data.bills)) {
      const ins = db.prepare(`INSERT INTO bills (id, billNumber, date, customer, items, subtotal, discount, discountType, vat, grandTotal, status, paymentMethod, notes, createdBy)
        VALUES (@id, @billNumber, @date, @customer, @items, @subtotal, @discount, @discountType, @vat, @grandTotal, @status, @paymentMethod, @notes, @createdBy)`);
      for (const raw of data.bills) {
        const b = raw as Record<string, unknown>;
        ins.run({
          id: b.id, billNumber: b.billNumber ?? '', date: b.date ?? new Date().toISOString().slice(0, 10),
          customer: typeof b.customer === 'string' ? b.customer : JSON.stringify(b.customer ?? {}),
          items: typeof b.items === 'string' ? b.items : JSON.stringify(b.items ?? []),
          subtotal: Number(b.subtotal ?? 0) || 0, discount: Number(b.discount ?? 0) || 0,
          discountType: b.discountType || 'flat', vat: Number(b.vat ?? 0) || 0,
          grandTotal: Number(b.grandTotal ?? 0) || 0, status: b.status || 'Pending',
          paymentMethod: b.paymentMethod || 'Cash', notes: b.notes ?? '', createdBy: b.createdBy ?? '',
        });
      }
    }
    if (replaceSettings) {
      const s = settingsBackup!;
      const settingsRow = {
        name: s.name ?? null,
        panNumber: s.panNumber ?? null,
        vatNumber: s.vatNumber ?? null,
        address: s.address ?? null,
        contactNumber: s.contactNumber ?? null,
        email: s.email ?? null,
        logo: s.logo ?? null,
        vatRate: s.vatRate ?? null,
        smtpHost: s.smtpHost ?? null,
        smtpPort: s.smtpPort != null && s.smtpPort !== '' ? Number(s.smtpPort) : null,
        smtpSecure: s.smtpSecure ? 1 : 0,
        smtpUser: s.smtpUser ?? null,
        smtpPass: s.smtpPass ?? null,
        smtpFrom: s.smtpFrom ?? null,
      };
      db.prepare(`INSERT INTO settings (id, name, panNumber, vatNumber, address, contactNumber, email, logo, vatRate, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom)
        VALUES (1, @name, @panNumber, @vatNumber, @address, @contactNumber, @email, @logo, @vatRate, @smtpHost, @smtpPort, @smtpSecure, @smtpUser, @smtpPass, @smtpFrom)`).run(settingsRow);
    }
  });

  importAll();
  res.json({ success: true, message: 'Data imported successfully' });
}));

// ── Database file backup ─────────────────────────────────────────────────────
// Streams a snapshot of the live SQLite file. In the desktop app the user picks
// the destination via the native "save" dialog.
router.post('/db-backup', wrap((_req, res) => {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // checkpoint is an optimisation — a non-truncated WAL still backs up fine
  }
  const stamp = new Date().toISOString().split('T')[0];
  res.download(DB_PATH, `printpress-db-backup-${stamp}.db`);
}));

// ── Database file restore ────────────────────────────────────────────────────
// Replaces the live database file with an uploaded backup. The current handle
// is flushed and closed, the file swapped, and a fresh handle opened — the app
// keeps working without a restart. Destructive by nature: the frontend must
// confirm with the user and recommend creating a backup first.
router.post(
  '/db-restore',
  express.raw({ type: ['application/octet-stream', 'application/x-sqlite3'], limit: '500mb' }),
  wrap((req, res) => {
    const buf = req.body as Buffer | undefined;
    if (!Buffer.isBuffer(buf) || buf.length < 16) {
      res.status(400).json({ error: 'No database file received' });
      return;
    }
    if (buf.subarray(0, 16).toString('utf8') !== 'SQLite format 3\0') {
      res.status(400).json({ error: 'Not a valid SQLite database file' });
      return;
    }
    try {
      replaceDatabase(buf);
      res.json({ success: true, message: 'Database restored successfully.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore database';
      // Try to bring the previous handle back rather than leaving the app
      // without a working database.
      try { initDatabase(); } catch { /* best effort */ }
      res.status(500).json({ error: message });
    }
  }),
);

export default router;
