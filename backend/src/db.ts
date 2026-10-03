import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readSync, renameSync, statSync } from 'fs';
import { rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { scryptSync, randomBytes } from 'crypto';

// The database location is configurable:
//  - Development (CLI / tsx): falls back to <repo>/data/printing.db
//  - Production (Electron): electron/main.ts sets PRINTPRESS_DB_PATH to the
//    per-user application-data directory BEFORE requiring this module.
export const DB_PATH =
  process.env.PRINTPRESS_DB_PATH || join(__dirname, '../../data/printing.db');

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

// Default SMTP account baked into every install so verification/reset emails
// (Settings → Email & SMTP) work out of the box. User edits in Settings are
// honoured; blank fields are re-filled with these defaults on startup.
const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const GMAIL_SMTP_USER = 'primelogictech3@gmail.com';
const GMAIL_SMTP_PASS = 'jgpa mcnt txij ymky';
const GMAIL_SMTP_FROM = 'primelogictech3@gmail.com';

// Self-heal: SQLite silently treats a missing or headerless file as a fresh
// empty database, which would discard all data and break the app. Detect a
// corrupt/truncated DB file and rebuild it from scratch instead.
function dbFileIsCorrupt(): boolean {
  if (!existsSync(DB_PATH)) return false;
  const size = statSync(DB_PATH).size;
  if (size === 0) return true;
  const fd = openSync(DB_PATH, 'r');
  const header = Buffer.alloc(16);
  readSync(fd, header, 0, 16, 0);
  closeSync(fd);
  return header.toString('utf8') !== 'SQLite format 3\0';
}

function applySchema(database: Database.Database) {
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  // ── Schema ──────────────────────────────────────────────────────────────────
  // customers: identity only — outstandingBalance is computed from pending bills
  database.exec(`
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
      vatRate       REAL,
      smtpHost      TEXT,
      smtpPort      INTEGER DEFAULT 587,
      smtpSecure    INTEGER NOT NULL DEFAULT 0,
      smtpUser      TEXT,
      smtpPass      TEXT,
      smtpFrom      TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      company_name   TEXT,
      full_name      TEXT NOT NULL,
      email          TEXT UNIQUE NOT NULL,
      username       TEXT UNIQUE,
      password_hash  TEXT NOT NULL,
      role           TEXT NOT NULL DEFAULT 'staff',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      email             TEXT NOT NULL,
      code              TEXT NOT NULL,
      expires_at        TEXT NOT NULL,
      used              INTEGER NOT NULL DEFAULT 0,
      resend_count      INTEGER NOT NULL DEFAULT 0,
      resend_window_start TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      code       TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_payments (
      id         TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      billId     TEXT,
      amount     REAL NOT NULL,
      date       TEXT NOT NULL,
      method     TEXT,
      note       TEXT NOT NULL DEFAULT ''
    );
  `);
}

// ── Migration: add new bill columns if missing ──────────────────────────────
function migrateBillsTable(database: Database.Database) {
  const cols = database.prepare('PRAGMA table_info(bills)').all() as Array<{ name: string }>;
  const colNames = cols.map(c => c.name);

  if (!colNames.includes('paymentMethod')) {
    database.exec("ALTER TABLE bills ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'Cash'");
  }
  if (!colNames.includes('notes')) {
    database.exec("ALTER TABLE bills ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.includes('createdBy')) {
    database.exec("ALTER TABLE bills ADD COLUMN createdBy TEXT NOT NULL DEFAULT 'Admin'");
  }
  if (!colNames.includes('discountType')) {
    database.exec("ALTER TABLE bills ADD COLUMN discountType TEXT NOT NULL DEFAULT 'percentage'");
  }
}

// ── Migration: drop outstandingBalance from customers if it still exists ─────
function migrateCustomersTable(database: Database.Database) {
  const cols = database.prepare('PRAGMA table_info(customers)').all() as Array<{ name: string }>;
  const hasBalance = cols.some((c) => c.name === 'outstandingBalance');
  if (!hasBalance) return;

  const migrate = database.transaction(() => {
    database.exec(`
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

// ── Migration: expenses ownership / receipt attachment fields ────────────────
function migrateExpensesTable(database: Database.Database) {
  const cols = database.prepare('PRAGMA table_info(expenses)').all() as Array<{ name: string }>;
  const colNames = cols.map(c => c.name);

  if (!colNames.includes('user_id')) {
    database.exec('ALTER TABLE expenses ADD COLUMN user_id TEXT');
  }
  if (!colNames.includes('receiptName')) {
    database.exec("ALTER TABLE expenses ADD COLUMN receiptName TEXT NOT NULL DEFAULT ''");
  }
  if (!colNames.includes('receiptData')) {
    database.exec("ALTER TABLE expenses ADD COLUMN receiptData TEXT NOT NULL DEFAULT ''");
  }
}

// ── Migration: staff expense edit permission flag + SMTP email settings ──────
function migrateSettingsTable(database: Database.Database) {
  const cols = database.prepare('PRAGMA table_info(settings)').all() as Array<{ name: string }>;
  const colNames = cols.map(c => c.name);

  if (!colNames.includes('staffExpenseEdit')) {
    database.exec('ALTER TABLE settings ADD COLUMN staffExpenseEdit INTEGER NOT NULL DEFAULT 0');
  }
  if (!colNames.includes('smtpHost')) {
    database.exec('ALTER TABLE settings ADD COLUMN smtpHost TEXT');
  }
  if (!colNames.includes('smtpPort')) {
    database.exec('ALTER TABLE settings ADD COLUMN smtpPort INTEGER DEFAULT 587');
  }
  if (!colNames.includes('smtpSecure')) {
    database.exec('ALTER TABLE settings ADD COLUMN smtpSecure INTEGER NOT NULL DEFAULT 0');
  }
  if (!colNames.includes('smtpUser')) {
    database.exec('ALTER TABLE settings ADD COLUMN smtpUser TEXT');
  }
  if (!colNames.includes('smtpPass')) {
    database.exec('ALTER TABLE settings ADD COLUMN smtpPass TEXT');
  }
  if (!colNames.includes('smtpFrom')) {
    database.exec('ALTER TABLE settings ADD COLUMN smtpFrom TEXT');
  }

  // Bake in the default Gmail SMTP account on existing installs whenever a
  // field is empty, so email sending is always configured.
  const smtpRow = database.prepare('SELECT smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass FROM settings WHERE id = 1')
    .get() as { smtpHost: string | null; smtpPort: number | null; smtpSecure: number | null; smtpUser: string | null; smtpPass: string | null } | undefined;
  const wrongTls = smtpRow && smtpRow.smtpHost === GMAIL_SMTP_HOST && smtpRow.smtpPort === 587 && smtpRow.smtpSecure === 1;
  if (smtpRow && (!smtpRow.smtpHost || !smtpRow.smtpUser || !smtpRow.smtpPass || wrongTls)) {
    database.prepare(`
      UPDATE settings
      SET smtpHost = ?, smtpPort = ?, smtpSecure = ?, smtpUser = ?, smtpPass = ?, smtpFrom = ?
      WHERE id = 1
    `).run(GMAIL_SMTP_HOST, 587, 0, GMAIL_SMTP_USER, GMAIL_SMTP_PASS, GMAIL_SMTP_FROM);
    console.log('✅ Migration: configured default SMTP (Gmail)');
  }
}

// ── Seed data (only if tables are empty — customers are never seeded) ────────
function seedIfEmpty(database: Database.Database) {
  const n = (database.prepare('SELECT COUNT(*) as n FROM settings').get() as { n: number }).n;
  if (n > 0) return;

  const insertInventory = database.prepare(`
    INSERT INTO inventory (id, name, category, unit, quantity, purchasePrice, vendor, status)
    VALUES (@id, @name, @category, @unit, @quantity, @purchasePrice, @vendor, @status)
  `);
  const insertVendor = database.prepare(`
    INSERT INTO vendors (id, name, phone, address, panNumber, outstandingBalance)
    VALUES (@id, @name, @phone, @address, @panNumber, @outstandingBalance)
  `);
  const insertExpense = database.prepare(`
    INSERT INTO expenses (id, category, amount, reason, date, addedBy)
    VALUES (@id, @category, @amount, @reason, @date, @addedBy)
  `);
  const insertBill = database.prepare(`
    INSERT INTO bills (id, billNumber, date, customer, items, subtotal, discount, discountType, vat, grandTotal, status, paymentMethod, notes, createdBy)
    VALUES (@id, @billNumber, @date, @customer, @items, @subtotal, @discount, @discountType, @vat, @grandTotal, @status, @paymentMethod, @notes, @createdBy)
  `);
  const insertSettings = database.prepare(`
    INSERT INTO settings (id, name, panNumber, vatNumber, address, contactNumber, email, logo, vatRate, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom)
    VALUES (1, @name, @panNumber, @vatNumber, @address, @contactNumber, @email, @logo, @vatRate, @smtpHost, @smtpPort, @smtpSecure, @smtpUser, @smtpPass, @smtpFrom)
  `);

  const seedAll = database.transaction(() => {
    insertInventory.run({ id: 'i1', name: 'A4 Paper',  category: 'Paper', unit: 'Ream',  quantity: 45, purchasePrice: 450,  vendor: 'Paper Mart',    status: 'In Stock'  });
    insertInventory.run({ id: 'i2', name: 'Black Ink', category: 'Ink',   unit: 'Liter', quantity: 8,  purchasePrice: 1200, vendor: 'Ink Suppliers', status: 'Low Stock' });

    insertVendor.run({ id: 'v1', name: 'Paper Mart', phone: '9851234567', address: 'Biratnagar', panNumber: 'PAN123456', outstandingBalance: 15000 });



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

    insertSettings.run({ name: 'Shree Printing Press', panNumber: 'PAN987654', vatNumber: 'VAT123456', address: 'New Road, Kathmandu, Nepal', contactNumber: '01-4567890', email: 'info@shreeprint.com', logo: '/logo.png', vatRate: 13, smtpHost: GMAIL_SMTP_HOST, smtpPort: 587, smtpSecure: 0, smtpUser: GMAIL_SMTP_USER, smtpPass: GMAIL_SMTP_PASS, smtpFrom: GMAIL_SMTP_FROM });
  });

  seedAll();
  console.log('✅ Database seeded with initial data');
}

// ── Seed: default admin account (only when the users table is empty) ─────────
// Ensures a fresh offline installation always has a working login. The same
// credentials documented for development are used; the hard-coded mock-user
// fallback is disabled in production (see routes/auth.ts).
function seedUsersIfEmpty(database: Database.Database) {
  const n = (database.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n;
  if (n > 0) return;

  database.prepare(`
    INSERT INTO users (id, company_name, full_name, email, username, password_hash, role, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, 'superadmin', 1)
  `).run('seed-superadmin', null, 'Super Admin', 'super@printpress.com', 'superadmin', hashPassword('admin123'));
  console.log('✅ Seeded superadmin account (username: superadmin)');
}

let currentDb: Database.Database;

// Opens (or re-opens) the database, applies the schema and migrations and runs
// the (non-destructive) seeding. Safe to call multiple times, e.g. after a
// database restore. Never overwrites an existing user's data.
export function initDatabase(): Database.Database {
  if (currentDb && currentDb.open) return currentDb;

  mkdirSync(dirname(DB_PATH), { recursive: true });
  if (dbFileIsCorrupt()) {
    const backup = `${DB_PATH}.corrupt-${Date.now()}`;
    console.warn(`⚠️ Database file is corrupt — backing it up to ${backup} and rebuilding.`);
    renameSync(DB_PATH, backup);
  }

  currentDb = new Database(DB_PATH);
  applySchema(currentDb);
  migrateBillsTable(currentDb);
  migrateCustomersTable(currentDb);
  migrateExpensesTable(currentDb);
  migrateSettingsTable(currentDb);
  seedIfEmpty(currentDb);
  seedUsersIfEmpty(currentDb);
  return currentDb;
}

// Flushes and closes the current database handle. Use before replacing the
// database file (restore) or during graceful application shutdown.
export function closeDatabase(): void {
  if (!currentDb) return;
  if (currentDb.open) {
    try {
      currentDb.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // ignore — file may already be unavailable
    }
    currentDb.close();
  }
  currentDb = null as unknown as Database.Database;
}

// A 16-byte SQLite header is necessary but nowhere near sufficient: a truncated
// download, a foreign `.db`, or a file from another application all pass that
// check. Opening the candidate and confirming one of our own tables exists is
// what actually proves the file is a PrintPress database.
function looksLikeAppDatabase(filePath: string): boolean {
  let probe: Database.Database | undefined;
  try {
    probe = new Database(filePath, { readonly: true });
    const row = probe
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'settings'")
      .get() as { name: string } | undefined;
    return row?.name === 'settings';
  } catch {
    return false;
  } finally {
    try { probe?.close(); } catch { /* ignore */ }
  }
}

// Replaces the live database file with the given Buffer (must be a valid SQLite
// file). Closes the old handle first and re-opens the new file so the running
// process keeps working without a restart.
//
// Restore is destructive, so the current database is copied to a timestamped
// `printing.db.pre-restore-<ts>.db` sibling before anything is overwritten. If
// the candidate then fails to validate or fails to reopen, that copy is put
// back so a failed restore can never leave the user without a database. The
// safety copy is kept on success too, so an unwanted restore is still
// recoverable without hunting for an external backup.
export function replaceDatabase(buffer: Buffer): void {
  if (buffer.length < 16 || buffer.subarray(0, 16).toString('utf8') !== 'SQLite format 3\0') {
    throw new Error('Not a valid SQLite database file');
  }

  const tmp = join(tmpdir(), `printpress-restore-${Date.now()}.db`);
  const safety = `${DB_PATH}.pre-restore-${Date.now()}`;

  // Checkpoint so the safety copy is a complete, self-contained database.
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* best effort */ }
  copyFileSync(DB_PATH, safety);

  closeDatabase();
  try {
    writeFileSync(tmp, buffer);
    if (!looksLikeAppDatabase(tmp)) {
      throw new Error(
        'That file is not a PrintPress ERP backup — it is missing the expected app tables.',
      );
    }
    copyFileSync(tmp, DB_PATH);
    rmSync(`${DB_PATH}-wal`, { force: true });
    rmSync(`${DB_PATH}-shm`, { force: true });
    initDatabase();
    console.log(`✅ Database restored. Previous data saved to ${safety}`);
  } catch (err) {
    // Put the original back: the live file may already have been overwritten.
    try {
      copyFileSync(safety, DB_PATH);
      rmSync(`${DB_PATH}-wal`, { force: true });
      rmSync(`${DB_PATH}-shm`, { force: true });
      initDatabase();
      console.error('⚠️ Restore failed — original database restored from safety copy.');
    } catch (rollbackErr) {
      console.error(
        `❌ Restore failed AND the original database could not be reinstated: ${String(rollbackErr)}`,
      );
    }
    throw err;
  } finally {
    try { rmSync(tmp, { force: true }); } catch { /* ignore */ }
  }
}

// The exported `db` is a live view of the current database handle. Every
// property read is forwarded to the live connection, with methods bound to the
// real Database instance. After a restore / re-open the same `db` export keeps
// working against the new handle — no re-imports anywhere in the codebase.
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    if (prop === 'then') return undefined; // keep the proxy thenable-safe
    const value = (currentDb as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(currentDb) : value;
  },
});

initDatabase();