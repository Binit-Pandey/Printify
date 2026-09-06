import { Router } from 'express';
import express from 'express';
import { db, DB_PATH, initDatabase, replaceDatabase } from '../db';
import { wrap } from './wrap';
import { authenticate, requireAdmin } from '../middleware/auth';
import { sendTestEmail } from '../email';

const router = Router();

router.use(authenticate);

router.get('/', wrap((_req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE id=1').get();
  if (!row) return res.status(404).json({ error: 'Settings not found' });
  res.json(row);
}));

// Everything below requires an admin account.
router.use(requireAdmin);

router.post('/test-email', wrap(async (req, res) => {
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

router.put('/', wrap((req, res) => {
  const existing = db.prepare('SELECT * FROM settings WHERE id=1').get() as Record<string, unknown> | undefined;
  const s = { ...existing, ...req.body };
  const row = {
    name: s.name ?? null,
    panNumber: s.panNumber ?? null,
    vatNumber: s.vatNumber ?? null,
    address: s.address ?? null,
    contactNumber: s.contactNumber ?? null,
    email: s.email ?? null,
    logo: s.logo ?? null,
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
  res.json(row);
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
    db.prepare('DELETE FROM settings').run();

    if (Array.isArray(data.customers)) {
      const ins = db.prepare('INSERT INTO customers (id, name, phone, address, email) VALUES (@id, @name, @phone, @address, @email)');
      for (const c of data.customers) ins.run(c);
    }
    if (Array.isArray(data.inventory)) {
      const ins = db.prepare('INSERT INTO inventory (id, name, category, unit, quantity, purchasePrice, vendor, status) VALUES (@id, @name, @category, @unit, @quantity, @purchasePrice, @vendor, @status)');
      for (const i of data.inventory) ins.run(i);
    }
    if (Array.isArray(data.vendors)) {
      const ins = db.prepare('INSERT INTO vendors (id, name, phone, address, panNumber, outstandingBalance) VALUES (@id, @name, @phone, @address, @panNumber, @outstandingBalance)');
      for (const v of data.vendors) ins.run(v);
    }
    if (Array.isArray(data.vendorPayments)) {
      const ins = db.prepare('INSERT INTO vendor_payments (id, vendorId, amount, date, type, description, dueDate) VALUES (@id, @vendorId, @amount, @date, @type, @description, @dueDate)');
      for (const p of data.vendorPayments) ins.run({ ...p, dueDate: p.dueDate || null });
    }
    if (Array.isArray(data.expenses)) {
      const ins = db.prepare('INSERT INTO expenses (id, category, amount, reason, date, addedBy) VALUES (@id, @category, @amount, @reason, @date, @addedBy)');
      for (const e of data.expenses) ins.run(e);
    }
    if (Array.isArray(data.bills)) {
      const ins = db.prepare(`INSERT INTO bills (id, billNumber, date, customer, items, subtotal, discount, discountType, vat, grandTotal, status, paymentMethod, notes, createdBy)
        VALUES (@id, @billNumber, @date, @customer, @items, @subtotal, @discount, @discountType, @vat, @grandTotal, @status, @paymentMethod, @notes, @createdBy)`);
      for (const b of data.bills) ins.run(b);
    }
    if (data.settings && typeof data.settings === 'object') {
      const s = data.settings as Record<string, unknown>;
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
