import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';

const router = Router();

const LIST_SQL = `
  SELECT
    c.id,
    c.name,
    c.phone,
    c.address,
    c.email,
    COALESCE(
      (SELECT SUM(b.grandTotal)
       FROM   bills b
       WHERE  json_extract(b.customer, '$.id') = c.id
         AND  b.status = 'Pending'),
      0
    ) AS outstandingBalance
  FROM customers c
  ORDER BY c.name
`;

router.post('/find-or-create', wrap((req, res, next) => {
  const { name, phone, address, email } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  if (phone) {
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone) as { id: string } | undefined;

    if (existing) {
      if (address || email) {
        db.prepare('UPDATE customers SET name=@name, address=COALESCE(@address, address), email=COALESCE(@email, email) WHERE id=@id')
          .run({ id: existing.id, name, address: address || null, email: email || null });
      }
      const customer = (db.prepare(LIST_SQL).all() as Array<{ id: string }>).find(r => r.id === existing.id);
      res.json(customer);
      return;
    }
  }

  const id = 'c_' + Math.random().toString(36).substr(2, 9);
  db.prepare('INSERT INTO customers (id, name, phone, address, email) VALUES (@id, @name, @phone, @address, @email)')
    .run({ id, name, phone, address: address || '', email: email || null });

  res.status(201).json({ id, name, phone, address: address || '', email: email || null, outstandingBalance: 0 });
}));

router.get('/with-due', wrap((_req, res) => {
  const rows = db.prepare(`
    SELECT * FROM (
      ${LIST_SQL}
    ) sub
    WHERE outstandingBalance > 0
  `).all();
  res.json(rows);
}));

router.get('/', wrap((_req, res) => {
  res.json(db.prepare(LIST_SQL).all());
}));

router.post('/', wrap((req, res) => {
  const { id, name, phone, address, email = null } = req.body;
  if (!id || !name || !phone || !address) {
    res.status(400).json({ error: 'id, name, phone, and address are required' });
    return;
  }
  db.prepare(`
    INSERT INTO customers (id, name, phone, address, email)
    VALUES (@id, @name, @phone, @address, @email)
  `).run({ id, name, phone, address, email });

  const created = db.prepare(LIST_SQL + ' LIMIT 1').all().find((r: unknown) => (r as { id: string }).id === id) ??
    { id, name, phone, address, email, outstandingBalance: 0 };
  res.status(201).json(created);
}));

router.put('/:id', wrap((req, res) => {
  const { name, phone, address, email = null } = req.body;
  db.prepare(`
    UPDATE customers
    SET name=@name, phone=@phone, address=@address, email=@email
    WHERE id=@id
  `).run({ id: req.params.id, name, phone, address, email });

  const updated = (db.prepare(LIST_SQL).all() as Array<{ id: string }>)
    .find((r) => r.id === req.params.id);
  res.json(updated ?? { id: req.params.id, name, phone, address, email, outstandingBalance: 0 });
}));

router.delete('/:id', wrap((req, res) => {
  db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
  res.status(204).send();
}));

export default router;
