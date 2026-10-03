import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', wrap((_req, res) => {
  const rows = db.prepare('SELECT * FROM inventory ORDER BY name').all();
  res.json(rows);
}));

// better-sqlite3 rejects a statement whose @placeholder has no matching key, so
// an omitted optional field would come back as a 500. Normalise every column.
function inventoryRow(body: Record<string, unknown>, id?: string) {
  const quantity = Number(body.quantity ?? 0) || 0;
  return {
    id: id ?? (body.id as string),
    name: (body.name as string) ?? '',
    category: (body.category as string) ?? '',
    unit: (body.unit as string) ?? '',
    quantity,
    purchasePrice: Number(body.purchasePrice ?? 0) || 0,
    vendor: (body.vendor as string) || '',
    status: (body.status as string) || (quantity > 20 ? 'In Stock' : quantity > 0 ? 'Low Stock' : 'Out of Stock'),
  };
}

router.post('/', wrap((req, res) => {
  const item = inventoryRow(req.body ?? {});
  if (!item.id || !item.name) {
    res.status(400).json({ error: 'Item name is required' });
    return;
  }
  db.prepare(`
    INSERT INTO inventory (id, name, category, unit, quantity, purchasePrice, vendor, status)
    VALUES (@id, @name, @category, @unit, @quantity, @purchasePrice, @vendor, @status)
  `).run(item);
  res.status(201).json(item);
}));

router.put('/:id', wrap((req, res) => {
  const item = inventoryRow(req.body ?? {}, req.params.id);
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
