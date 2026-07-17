# PrintPress ERP

Billing, inventory, vendor, and expense management system for commercial printing press businesses.

## How to run

Two workflows are configured and must both be running:

| Workflow | Command | Port |
|----------|---------|------|
| Start backend | `cd backend && npm run dev` | 3001 |
| Start application | `npm run dev` | 5000 |

The frontend (port 5000) proxies all `/api/*` requests to the backend (port 3001) automatically via Vite config.

## Default login credentials

| Username | Password | Role |
|----------|----------|------|
| superadmin | admin123 | Super Admin |
| admin | admin123 | Admin |
| staff | admin123 | Staff (limited view) |

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Recharts + jsPDF
- **Backend**: Express 4 + TypeScript + better-sqlite3 (SQLite)
- **Database**: SQLite — auto-created at `data/printing.db` on first run; no external DB needed
- **Build tools**: tsx (backend hot-reload), oxlint

## Project structure

```
├── src/                  # Frontend (React + Vite)
│   ├── pages/            # Billing, Bills, Customers, Dashboard, Expenses, Inventory, Reports, Settings, Vendors
│   ├── components/       # Sidebar, Navbar, InvoicePreview, ConfirmModal, Toast
│   ├── contexts/         # AuthContext, ThemeContext, store (Zustand)
│   ├── services/api.ts   # Axios API client (calls /api/*)
│   └── utils/            # PDF generator, number-to-words, validation schemas
├── backend/src/
│   ├── index.ts          # Express app entry point
│   ├── db.ts             # SQLite schema, migrations, seed data
│   └── routes/           # bills, customers, expenses, inventory, settings, vendors, vendorPayments
├── data/printing.db      # SQLite database file
└── vite.config.ts        # Dev server on port 5000, proxies /api → :3001
```

## Features

- **Billing** — Create invoices with line items, discounts, VAT; live preview; PDF download; print
- **Bills** — View/manage all invoices; toggle Paid/Pending; duplicate bills
- **Customers** — Track customers with outstanding (credit) balances
- **Inventory** — Stock management with vendor assignment and due/paid purchase tracking
- **Vendors** — Supplier management, payment recording, aging due report (PDF)
- **Expenses** — Categorized expense tracking with monthly filtering
- **Reports** — Revenue, expense, profit charts; CSV export; date range filtering
- **Settings** — Company info, VAT rate, data export/import (JSON backup/restore)
- **Dark/Light mode** — Toggle via navbar
- **Role-based access** — Superadmin, Admin, Staff roles

## Notes

- Auth is frontend-only (mock users in `src/mock-data/index.ts`); all backend routes are open
- SQLite is embedded — no database server needed
- Bills paid via Cash/Card/Online are auto-marked **Paid**; Credit bills are **Pending** (tracked per customer)
- `better-sqlite3` requires Python + gcc to compile; these are installed as Nix system packages

## User preferences

- Keep the existing project structure and stack unchanged
