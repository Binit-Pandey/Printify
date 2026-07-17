import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';

const router = Router();

router.get('/', wrap((_req, res) => {
  const rows = db.prepare('SELECT * FROM inventory ORDER BY name').all();
  res.json(rows);
}));

router.post('/', wrap((req, res) => {
  const item = req.body;
  db.prepare(`
    INSERT INTO inventory (id, name, category, unit, quantity, purchasePrice, vendor, status)
    VALUES (@id, @name, @category, @unit, @quantity, @purchasePrice, @vendor, @status)
  `).run(item);
  res.status(201).json(item);
}));

router.put('/:id', wrap((req, res) => {
  const item = { ...req.body, id: req.params.id };
  db.prepare(`
    UPDATE inventory SET name=@name, category=@category, unit=@unit,
      quantity=@quantity, purchasePrice=@purchasePrice, vendor=@vendor, status=@status
    WHERE id=@id
  `).run(item);
  res.json(item);
}));

router.delete('/:id', wrap((req, res) => {
  db.prepare('DELETE FROM inventory WHERE id=?').run(req.params.id);
  res.status(204).send();
}));

export default router;
