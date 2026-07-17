import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(__dirname, '../../data/printing.db');
export const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────
// customers: identity only — outstandingBalance is computed from pending bills
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    phone   TEXT NOT NULL,
    address TEXT NOT NULL,
    email   TEXT
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    unit          TEXT NOT NULL,
    quantity      REAL NOT NULL DEFAULT 0,
    purchasePrice REAL NOT NULL DEFAULT 0,
    vendor        TEXT NOT NULL,
    status        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    phone              TEXT NOT NULL,
    address            TEXT NOT NULL,
    panNumber          TEXT NOT NULL,
    outstandingBalance REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id       TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount   REAL NOT NULL,
    reason   TEXT NOT NULL,
    date     TEXT NOT NULL,
    addedBy  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bills (
    id         TEXT PRIMARY KEY,
    billNumber TEXT NOT NULL,
    date       TEXT NOT NULL,
    customer   TEXT NOT NULL,
    items      TEXT NOT NULL,
    subtotal   REAL NOT NULL,
    discount   REAL NOT NULL,
    vat        REAL NOT NULL,
    grandTotal REAL NOT NULL,
    status     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vendor_payments (
    id          TEXT PRIMARY KEY,
    vendorId    TEXT NOT NULL,
    amount      REAL NOT NULL,
    date        TEXT NOT NULL,
    type        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    dueDate     TEXT,
    FOREIGN KEY (vendorId) REFERENCES vendors(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    name          TEXT,
    panNumber     TEXT,
    vatNumber     TEXT,
    address       TEXT,
    contactNumber TEXT,
    email         TEXT,
    logo          TEXT,
    vatRate       REAL
  );
`);

// ── Migration: add new bill columns if missing ──────────────────────────────
function migrateBillsTable() {
  const cols = db.prepare('PRAGMA table_info(bills)').all() as Array<{ name: string }>;
  const colNames = cols.map(c => c.name);

  if (!colNames.includes('paymentMethod')) {
    db.exec("ALTER TABLE bills ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'Cash'");
  }
  if (!colNames.includes('notes')) {
    db.exec("ALTER TABLE bills ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.includes('createdBy')) {
    db.exec("ALTER TABLE bills ADD COLUMN createdBy TEXT NOT NULL DEFAULT 'Admin'");
  }
  if (!colNames.includes('discountType')) {
    db.exec("ALTER TABLE bills ADD COLUMN discountType TEXT NOT NULL DEFAULT 'percentage'");
  }
}

migrateBillsTable();

// ── Migration: drop outstandingBalance from customers if it still exists ─────
function migrateCustomersTable() {
  const cols = db.prepare('PRAGMA table_info(customers)').all() as Array<{ name: string }>;
  const hasBalance = cols.some((c) => c.name === 'outstandingBalance');
  if (!hasBalance) return;

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE customers_v2 (
        id      TEXT PRIMARY KEY,
        name    TEXT NOT NULL,
        phone   TEXT NOT NULL,
        address TEXT NOT NULL,
        email   TEXT
      );
      INSERT INTO customers_v2 (id, name, phone, address, email)
        SELECT id, name, phone, address, email FROM customers;
      DROP TABLE customers;
      ALTER TABLE customers_v2 RENAME TO customers;
    `);
  });
  migrate();
  console.log('✅ Migration: removed outstandingBalance from customers table');
}

migrateCustomersTable();

// ── Seed data (only if tables are empty — customers are never seeded) ────────
function seedIfEmpty() {
  const n = (db.prepare('SELECT COUNT(*) as n FROM settings').get() as { n: number }).n;
  if (n > 0) return;

  const insertInventory = db.prepare(`
    INSERT INTO inventory (id, name, category, unit, quantity, purchasePrice, vendor, status)
    VALUES (@id, @name, @category, @unit, @quantity, @purchasePrice, @vendor, @status)
  `);
  const insertVendor = db.prepare(`
    INSERT INTO vendors (id, name, phone, address, panNumber, outstandingBalance)
    VALUES (@id, @name, @phone, @address, @panNumber, @outstandingBalance)
  `);
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, category, amount, reason, date, addedBy)
    VALUES (@id, @category, @amount, @reason, @date, @addedBy)
  `);
  const insertBill = db.prepare(`
    INSERT INTO bills (id, billNumber, date, customer, items, subtotal, discount, discountType, vat, grandTotal, status, paymentMethod, notes, createdBy)
    VALUES (@id, @billNumber, @date, @customer, @items, @subtotal, @discount, @discountType, @vat, @grandTotal, @status, @paymentMethod, @notes, @createdBy)
  `);
  const insertSettings = db.prepare(`
    INSERT INTO settings (id, name, panNumber, vatNumber, address, contactNumber, email, logo, vatRate)
    VALUES (1, @name, @panNumber, @vatNumber, @address, @contactNumber, @email, @logo, @vatRate)
  `);

  const seedAll = db.transaction(() => {
    insertInventory.run({ id: 'i1', name: 'A4 Paper',  category: 'Paper', unit: 'Ream',  quantity: 45, purchasePrice: 450,  vendor: 'Paper Mart',    status: 'In Stock'  });
    insertInventory.run({ id: 'i2', name: 'Black Ink', category: 'Ink',   unit: 'Liter', quantity: 8,  purchasePrice: 1200, vendor: 'Ink Suppliers', status: 'Low Stock' });

    insertVendor.run({ id: 'v1', name: 'Paper Mart', phone: '9851234567', address: 'Biratnagar', panNumber: 'PAN123456', outstandingBalance: 15000 });

    insertExpense.run({ id: 'e1', category: 'Rent', amount: 25000, reason: 'Monthly office rent', date: '2026-07-01', addedBy: 'Admin' });

    // Seed demo bills (customer JSON is embedded — no FK to customers table)
    insertBill.run({
      id: 'b1', billNumber: 'INV-260705-00001', date: '2026-07-05',
      customer: JSON.stringify({ id: 'c_demo1', name: 'Rahul Sharma', phone: '9841234567', address: 'Kathmandu, Nepal', email: 'rahul@email.com', outstandingBalance: 0 }),
      items: JSON.stringify([{ id: 'bi1', name: 'Visiting Cards', quantity: 1000, unitPrice: 2.5, discount: 0 }]),
      subtotal: 2500, discount: 0, discountType: 'percentage', vat: 325, grandTotal: 2825, status: 'Paid',
      paymentMethod: 'Cash', notes: '', createdBy: 'Admin',
    });
    insertBill.run({
      id: 'b2', billNumber: 'INV-260710-00002', date: '2026-07-10',
      customer: JSON.stringify({ id: 'c_demo2', name: 'Priya Patel', phone: '9861234567', address: 'Pokhara, Nepal', email: 'priya@email.com', outstandingBalance: 0 }),
      items: JSON.stringify([{ id: 'bi2', name: 'Letterheads', quantity: 500, unitPrice: 8, discount: 5 }]),
      subtotal: 4000, discount: 200, discountType: 'fixed', vat: 494, grandTotal: 4294, status: 'Pending',
      paymentMethod: 'Credit', notes: 'Delivery within 3 days', createdBy: 'Admin',
    });

    insertSettings.run({ name: 'Shree Printing Press', panNumber: 'PAN987654', vatNumber: 'VAT123456', address: 'New Road, Kathmandu, Nepal', contactNumber: '01-4567890', email: 'info@shreeprint.com', logo: '/logo.png', vatRate: 13 });
  });

  seedAll();
  console.log('✅ Database seeded with initial data');
}

seedIfEmpty();
