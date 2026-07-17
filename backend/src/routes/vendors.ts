import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';

const router = Router();

router.get('/', wrap((_req, res) => {
  const rows = db.prepare('SELECT * FROM vendors ORDER BY name').all();
  res.json(rows);
}));

router.post('/', wrap((req, res) => {
  const v = req.body;
  db.prepare(`
    INSERT INTO vendors (id, name, phone, address, panNumber, outstandingBalance)
    VALUES (@id, @name, @phone, @address, @panNumber, @outstandingBalance)
  `).run(v);
  res.status(201).json(v);
}));

router.put('/:id', wrap((req, res) => {
  const v = { ...req.body, id: req.params.id };
  db.prepare(`
    UPDATE vendors SET name=@name, phone=@phone, address=@address,
      panNumber=@panNumber, outstandingBalance=@outstandingBalance
    WHERE id=@id
  `).run(v);
  res.json(v);
}));

router.delete('/:id', wrap((req, res) => {
  const deleteVendor = db.transaction(() => {
    db.prepare('DELETE FROM vendor_payments WHERE vendorId = ?').run(req.params.id);
    db.prepare('DELETE FROM vendors WHERE id=?').run(req.params.id);
  });
  deleteVendor();
  res.status(204).send();
}));

export default router;
