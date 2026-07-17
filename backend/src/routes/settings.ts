import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';

const router = Router();

router.get('/', wrap((_req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE id=1').get();
  if (!row) return res.status(404).json({ error: 'Settings not found' });
  res.json(row);
}));

router.put('/', wrap((req, res) => {
  const s = req.body;
  db.prepare(`
    UPDATE settings SET name=@name, panNumber=@panNumber, vatNumber=@vatNumber,
      address=@address, contactNumber=@contactNumber, email=@email,
      logo=@logo, vatRate=@vatRate
    WHERE id=1
  `).run(s);
  res.json(s);
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
      const s = data.settings;
      db.prepare(`INSERT INTO settings (id, name, panNumber, vatNumber, address, contactNumber, email, logo, vatRate)
        VALUES (1, @name, @panNumber, @vatNumber, @address, @contactNumber, @email, @logo, @vatRate)`).run(s);
    }
  });

  importAll();
  res.json({ success: true, message: 'Data imported successfully' });
}));

export default router;
