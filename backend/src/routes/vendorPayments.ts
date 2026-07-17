import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';

const router = Router();

router.get('/all', wrap((_req, res) => {
  const rows = db.prepare(`
    SELECT vp.*, v.name as vendorName, v.phone as vendorPhone
    FROM vendor_payments vp
    JOIN vendors v ON v.id = vp.vendorId
    ORDER BY vp.date DESC
  `).all();
  res.json(rows);
}));

router.get('/:vendorId', wrap((req, res) => {
  const rows = db.prepare('SELECT * FROM vendor_payments WHERE vendorId = ? ORDER BY date DESC').all(req.params.vendorId);
  res.json(rows);
}));

router.post('/', wrap((req, res) => {
  const p = req.body;
  db.prepare(`
    INSERT INTO vendor_payments (id, vendorId, amount, date, type, description, dueDate)
    VALUES (@id, @vendorId, @amount, @date, @type, @description, @dueDate)
  `).run({ ...p, dueDate: p.dueDate || null });

  const balance = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE -amount END), 0) as total
    FROM vendor_payments WHERE vendorId = ?
  `).get(p.vendorId) as { total: number };
  db.prepare('UPDATE vendors SET outstandingBalance = ? WHERE id = ?').run(balance.total, p.vendorId);

  res.status(201).json(p);
}));

router.delete('/:id', wrap((req, res) => {
  const payment = db.prepare('SELECT vendorId FROM vendor_payments WHERE id = ?').get(req.params.id) as { vendorId: string } | undefined;
  db.prepare('DELETE FROM vendor_payments WHERE id = ?').run(req.params.id);
  if (payment) {
    const balance = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE -amount END), 0) as total
      FROM vendor_payments WHERE vendorId = ?
    `).get(payment.vendorId) as { total: number };
    db.prepare('UPDATE vendors SET outstandingBalance = ? WHERE id = ?').run(balance.total, payment.vendorId);
  }
  res.status(204).send();
}));

export default router;
