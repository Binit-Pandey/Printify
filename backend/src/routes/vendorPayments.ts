import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

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
  const p = req.body ?? {};
  const vendorId = p.vendorId as string;
  if (!vendorId) {
    res.status(400).json({ error: 'A vendor is required' });
    return;
  }
  const payment = {
    id: p.id as string,
    vendorId,
    amount: Number(p.amount ?? 0) || 0,
    date: (p.date as string) ?? new Date().toISOString().slice(0, 10),
    type: (p.type as string) || 'payment',
    description: (p.description as string) || '',
    dueDate: (p.dueDate as string) || null,
  };
  db.prepare(`
    INSERT INTO vendor_payments (id, vendorId, amount, date, type, description, dueDate)
    VALUES (@id, @vendorId, @amount, @date, @type, @description, @dueDate)
  `).run(payment);

  const balance = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE -amount END), 0) as total
    FROM vendor_payments WHERE vendorId = ?
  `).get(vendorId) as { total: number };
  db.prepare('UPDATE vendors SET outstandingBalance = ? WHERE id = ?').run(balance.total, vendorId);

  res.status(201).json(payment);
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
