# PrintPress ERP

Billing, inventory, vendor, and expense management system for printing press businesses.

## Quick Start (2 commands)

```bash
# 1. Install all dependencies
cd backend && npm install && cd .. && npm install

# 2. Start both servers
cd backend && npm run dev &
npm run dev
```

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3001/api/health

### Default Login

| Field    | Value        |
|----------|--------------|
| Username | superadmin   |
| Password | admin123     |

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9

No database installation needed — SQLite is embedded via `better-sqlite3`.

---

## Project Structure

```
Printify/
├── src/                    # Frontend (React + Vite)
│   ├── pages/              # Billing, Inventory, Vendors, Reports, etc.
│   ├── components/         # Sidebar, Navbar, modals
│   ├── contexts/store.ts   # Zustand global state
│   ├── services/api.ts     # HTTP client (calls /api/*)
│   └── utils/              # PDF generation, validation
├── backend/                # Backend (Express + SQLite)
│   ├── src/routes/         # customers, inventory, vendors, bills, etc.
│   ├── src/db.ts           # Schema, migrations, seed data
│   └── data/printpress.db  # SQLite database (auto-created)
├── package.json            # Frontend scripts
└── vite.config.ts          # Dev server (port 5000, proxies /api → :3001)
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start frontend dev server (port 5000) |
| `npm run build` | Build frontend for production |
| `npm run lint` | Run oxlint |
| `cd backend && npm run dev` | Start backend with hot-reload (port 3001) |
| `cd backend && npm start` | Start backend without hot-reload |

---

## Features

- **Billing** — Create invoices with line items, discounts, VAT, print/PDF output
- **Inventory** — Track items with vendor assignment, stock levels, paid/due purchases
- **Vendors** — Manage suppliers, record payments, aging due reports (PDF)
- **Customers** — View customers with outstanding balances
- **Expenses** — Categorize and track business expenses
- **Reports** — Sales, expenses, profit/loss, daily summary with date filtering
- **Dashboard** — Real-time revenue, bill count, customer/vendor stats
- **Dark/Light mode** — Toggle via navbar
- **Role-based access** — Superadmin and Staff roles

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Zustand, Recharts, jsPDF |
| Backend | Express 4, TypeScript, better-sqlite3 |
| Build | Vite 8, tsx (backend runner) |
| Database | SQLite (auto-created at `backend/data/printpress.db`) |

---

## Environment

No `.env` file required. Default ports:

| Service | Port |
|---------|------|
| Frontend (Vite) | 5000 |
| Backend (Express) | 3001 |

Vite proxies `/api/*` requests to `localhost:3001` automatically.
