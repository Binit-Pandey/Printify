import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// better-sqlite3 throws "Missing named parameter" when a @placeholder has no
// matching key, so an omitted optional field would otherwise surface as a 500.
// Every column is normalised explicitly here.
function vendorRow(body: Record<string, unknown>, id?: string) {
  return {
    id: id ?? (body.id as string),
    name: (body.name as string) ?? '',
    phone: (body.phone as string) ?? '',
    // address and panNumber are NOT NULL columns: store empty strings, not null.
    address: (body.address as string) || '',
    panNumber: (body.panNumber as string) || '',
    outstandingBalance: Number(body.outstandingBalance ?? 0) || 0,
  };
}

router.get('/', wrap((_req, res) => {
  const rows = db.prepare('SELECT * FROM vendors ORDER BY name').all();
  res.json(rows);
}));

router.post('/', wrap((req, res) => {
  const v = vendorRow(req.body ?? {});
  if (!v.id || !v.name) {
    res.status(400).json({ error: 'Vendor name is required' });
    return;
  }
  db.prepare(`
    INSERT INTO vendors (id, name, phone, address, panNumber, outstandingBalance)
    VALUES (@id, @name, @phone, @address, @panNumber, @outstandingBalance)
  `).run(v);
  res.status(201).json(v);
}));

router.put('/:id', wrap((req, res) => {
  const v = vendorRow(req.body ?? {}, req.params.id);
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
