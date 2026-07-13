import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM customers ORDER BY name').all();
  res.json(rows);
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name, phone, address, email = null, outstandingBalance = 0 } = req.body;
    if (!id || !name || !phone || !address) {
      res.status(400).json({ error: 'id, name, phone, and address are required' });
      return;
    }
    const c = { id, name, phone, address, email, outstandingBalance };
    db.prepare(`
      INSERT INTO customers (id, name, phone, address, email, outstandingBalance)
      VALUES (@id, @name, @phone, @address, @email, @outstandingBalance)
    `).run(c);
    res.status(201).json(c);
  } catch (err: unknown) {
    next(err);
  }
});

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, address, email = null, outstandingBalance = 0 } = req.body;
    const c = { id: req.params.id, name, phone, address, email, outstandingBalance };
    db.prepare(`
      UPDATE customers SET name=@name, phone=@phone, address=@address,
        email=@email, outstandingBalance=@outstandingBalance
      WHERE id=@id
    `).run(c);
    res.json(c);
  } catch (err: unknown) {
    next(err);
  }
});

router.delete('/:id', (_req, res) => {
  db.prepare('DELETE FROM customers WHERE id=?').run(_req.params.id);
  res.status(204).send();
});

export default router;
