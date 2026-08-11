import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// ── Record a payment against a customer (optionally a specific bill) ────────
router.post('/', wrap((req, res) => {
  const { customerId, billId, amount, date, method, note } = req.body;

  if (!customerId || amount == null || Number(amount) <= 0) {
    res.status(400).json({ error: 'customerId and a positive amount are required' });
    return;
  }

  const payment = {
    id: 'cp_' + crypto.randomUUID().replace(/-/g, ''),
    customerId,
    billId: billId || null,
    amount: Number(amount),
    date: date || new Date().toISOString().split('T')[0],
    method: method || 'Cash',
    note: note || '',
  };

  db.transaction(() => {
    db.prepare(`
      INSERT INTO customer_payments (id, customerId, billId, amount, date, method, note)
      VALUES (@id, @customerId, @billId, @amount, @date, @method, @note)
    `).run(payment);

    if (payment.billId) {
      const bill = db.prepare('SELECT id, grandTotal, status FROM bills WHERE id = ?')
        .get(payment.billId) as { id: string; grandTotal: number; status: string } | undefined;

      if (bill && bill.status === 'Pending') {
        const paid = (db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM customer_payments WHERE billId = ?
        `).get(payment.billId) as { total: number }).total;

        if (paid >= bill.grandTotal) {
          db.prepare('UPDATE bills SET status = ? WHERE id = ?').run('Paid', payment.billId);
        }
      }
    }
  })();

  res.status(201).json(payment);
}));

// ── Payment history for a single customer ───────────────────────────────────
router.get('/:customerId', wrap((req, res) => {
  const rows = db.prepare(`
    SELECT * FROM customer_payments
    WHERE customerId = ?
    ORDER BY date DESC
  `).all(req.params.customerId);
  res.json(rows);
}));

export default router;
