# PrintPress ERP

## Overview
A printing press management ERP frontend built as a single-page React application. Covers dashboard analytics, billing, and customer management for a print shop, with role-based views (superadmin, admin, staff).

## Tech Stack
- React 19 + TypeScript + Vite 8
- react-router-dom v7 for routing
- Tailwind CSS v4 for styling
- recharts for dashboard charts
- react-hook-form + zod for the billing form
- lucide-react for icons, framer-motion for sidebar animation

## Project Architecture
- `src/main.tsx` — app entry, wraps app in `BrowserRouter` and `AuthContext`
- `src/App.tsx` — route definitions
- `src/contexts/AuthContext.tsx` — mocked client-side auth (no backend); hardcoded demo users
- `src/layouts/DashboardLayout.tsx` — authenticated shell (Sidebar + Navbar + `<Outlet />`)
- `src/pages/` — Login, Dashboard, Billing, Customers
- `src/mock-data/` — in-memory mock data (no real backend/database)
- `src/types/` — shared TypeScript interfaces

This is a pure frontend project with no backend server — all data is mocked in-memory and resets on reload.

## Demo Credentials
- Username: `superadmin`, `admin`, or `staff`
- Password: `admin123` (same for all roles)

## Development
- Dev server runs via the "Start application" workflow (`npm run dev`), bound to `0.0.0.0:5000` with `allowedHosts: true` for the Replit proxy/iframe preview.
- Deployment target: static site (`npm run build` → `dist/`).

## User Preferences
None recorded yet.
