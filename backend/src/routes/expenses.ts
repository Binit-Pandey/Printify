import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';
import { authenticate, requireAdmin } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

function isAdmin(role?: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

function canStaffEditExpenses(): boolean {
  const row = db.prepare('SELECT staffExpenseEdit FROM settings WHERE id = 1').get() as { staffExpenseEdit?: number } | undefined;
  return !!row?.staffExpenseEdit;
}

// ── Admin only: complete expense list ───────────────────────────────────────
router.get('/', requireAdmin, wrap((_req, res) => {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  res.json(rows);
}));

// ── Any authenticated user: their own submissions + edit permission ─────────
router.get('/mine', wrap((req: AuthenticatedRequest, res) => {
  const rows = db.prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC').all(req.user!.id);
  res.json({ expenses: rows, canEditOwn: canStaffEditExpenses() });
}));

// ── View own expense (or any, for admin) ────────────────────────────────────
router.get('/:id', wrap((req: AuthenticatedRequest, res) => {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  if (!isAdmin(req.user!.role) && row.user_id !== req.user!.id) {
    res.status(403).json({ error: 'Access denied: you can only view your own expenses' });
    return;
  }
  res.json(row);
}));

// ── Create: any authenticated user (admin or staff) ─────────────────────────
router.post('/', wrap((req: AuthenticatedRequest, res) => {
  const e = req.body;
  const expense = {
    id: e.id ?? ('e_' + crypto.randomUUID().replace(/-/g, '')),
    category: e.category,
    amount: e.amount,
    reason: e.reason || '',
    date: e.date,
    addedBy: req.user!.name,
    user_id: req.user!.id,
    receiptName: e.receiptName || '',
    receiptData: e.receiptData || '',
  };
  db.prepare(`
    INSERT INTO expenses (id, category, amount, reason, date, addedBy, user_id, receiptName, receiptData)
    VALUES (@id, @category, @amount, @reason, @date, @addedBy, @user_id, @receiptName, @receiptData)
  `).run(expense);
  res.status(201).json(expense);
}));

// ── Update: admin, or owner (staff) only when allowed by settings ───────────
router.put('/:id', wrap((req: AuthenticatedRequest, res) => {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  const isOwner = row.user_id === req.user!.id;
  if (!isAdmin(req.user!.role) && !(isOwner && canStaffEditExpenses())) {
    res.status(403).json({ error: 'Access denied: you cannot edit this expense' });
    return;
  }

  const e = req.body;
  const expense = {
    id: req.params.id,
    category: e.category,
    amount: e.amount,
    reason: e.reason || '',
    date: e.date,
    addedBy: row.addedBy,
    user_id: row.user_id,
    receiptName: e.receiptName || row.receiptName || '',
    receiptData: e.receiptData || row.receiptData || '',
  };
  db.prepare(`
    UPDATE expenses SET category=@category, amount=@amount, reason=@reason, date=@date,
      addedBy=@addedBy, user_id=@user_id, receiptName=@receiptName, receiptData=@receiptData
    WHERE id=@id
  `).run(expense);
  res.json(expense);
}));

// ── Delete: admin only ──────────────────────────────────────────────────────
router.delete('/:id', requireAdmin, wrap((req, res) => {
  db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id);
  res.status(204).send();
}));

export default router;
