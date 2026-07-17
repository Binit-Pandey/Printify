import { Router } from 'express';
import { db } from '../db';
import { wrap } from './wrap';

const router = Router();

const rowToBill = (row: Record<string, unknown>) => ({
  ...row,
  customer: JSON.parse(row.customer as string),
  items: JSON.parse(row.items as string),
});

router.get('/', wrap((_req, res) => {
  const rows = db.prepare('SELECT * FROM bills ORDER BY date DESC').all() as Record<string, unknown>[];
  res.json(rows.map(rowToBill));
}));

router.post('/', wrap((req, res) => {
  const bill = req.body;
  db.prepare(`
    INSERT INTO bills (id, billNumber, date, customer, items, subtotal, discount, discountType, vat, grandTotal, status, paymentMethod, notes, createdBy)
    VALUES (@id, @billNumber, @date, @customer, @items, @subtotal, @discount, @discountType, @vat, @grandTotal, @status, @paymentMethod, @notes, @createdBy)
  `).run({
    id: bill.id,
    billNumber: bill.billNumber,
    date: bill.date,
    customer: JSON.stringify(bill.customer),
    items: JSON.stringify(bill.items),
    subtotal: bill.subtotal,
    discount: bill.discount || 0,
    discountType: bill.discountType || 'percentage',
    vat: bill.vat,
    grandTotal: bill.grandTotal,
    status: bill.status,
    paymentMethod: bill.paymentMethod || 'Cash',
    notes: bill.notes || '',
    createdBy: bill.createdBy || 'Admin',
  });
  res.status(201).json(bill);
}));

router.put('/:id', wrap((req, res) => {
  const bill = { ...req.body, id: req.params.id };
  db.prepare(`
    UPDATE bills SET billNumber=@billNumber, date=@date, customer=@customer,
      items=@items, subtotal=@subtotal, discount=@discount, discountType=@discountType,
      vat=@vat, grandTotal=@grandTotal, status=@status,
      paymentMethod=@paymentMethod, notes=@notes, createdBy=@createdBy
    WHERE id=@id
  `).run({
    id: bill.id,
    billNumber: bill.billNumber,
    date: bill.date,
    customer: JSON.stringify(bill.customer),
    items: JSON.stringify(bill.items),
    subtotal: bill.subtotal,
    discount: bill.discount || 0,
    discountType: bill.discountType || 'percentage',
    vat: bill.vat,
    grandTotal: bill.grandTotal,
    status: bill.status,
    paymentMethod: bill.paymentMethod || 'Cash',
    notes: bill.notes || '',
    createdBy: bill.createdBy || 'Admin',
  });
  res.json(bill);
}));

router.delete('/:id', wrap((req, res) => {
  db.prepare('DELETE FROM bills WHERE id=?').run(req.params.id);
  res.status(204).send();
}));

export default router;
