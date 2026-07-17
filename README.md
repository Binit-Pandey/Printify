# Prime Printify - Printing Press Billing & Management System

A modern, commercial-grade software solution for printing press businesses to manage billing, inventory, customers, expenses, vendors, and reporting all in one place.

## Overview

Prime Printify replaces manual registers and Excel sheets with an easy-to-use digital management system. It streamlines daily operations from bill creation through automated reporting, enabling printing press owners to focus on their core business.

## Key Features

### Phase 1: MVP (Current) ✅
- **Login & User Management** - Secure authentication for staff
- **Dashboard** - Real-time overview of sales, revenue, and pending bills
- **Billing** - Create and print bills with automatic calculations
- **Customers** - Manage customer information and history
- **Bill Printing** - Professional bill output in PDF format

### Phase 2: Coming Soon
- **Inventory Management** - Track materials and stock levels
- **Vendor Management** - Manage suppliers and vendor information
- **Expense Tracking** - Record and categorize business expenses

### Phase 3: Advanced Features
- **Reports & Analytics** - Comprehensive business reports
- **Charts & Visualizations** - Visual data analysis
- **Profit Analysis** - Detailed profitability metrics

### Phase 4: Enterprise Features
- **Offline Mode** - Work without internet connectivity
- **Auto Sync** - Automatic data synchronization
- **Backup & Recovery** - Automated data backups
- **Audit Logs** - Complete activity tracking and compliance

## Tech Stack

### Frontend
- **React 19.2** - Modern UI framework with hooks
- **TypeScript** - Type-safe code
- **Tailwind CSS 4** - Utility-first styling
- **React Router v7** - Client-side routing
- **Recharts** - Data visualization charts
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library
- **jsPDF & html2canvas** - PDF generation

### Backend (To be implemented)
- **Node.js** - Runtime environment
- **Express.js** - Web server framework
- **TypeScript** - Type-safe backend code
- **PostgreSQL** - Relational database

### Features
- **Responsive Design** - Works on desktop and mobile
- **Dark/Light Mode** - Professional theme support
- **PWA Ready** - Progressive Web App capabilities
- **Offline Storage** - IndexedDB for local data persistence

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Sidebar.tsx      # Main navigation
│   ├── Navbar.tsx       # Header component
│   └── ui/              # UI component library
├── pages/               # Page components
│   ├── Dashboard.tsx    # Dashboard page
│   ├── Billing.tsx      # Bill creation
│   ├── Bills.tsx        # Bills list
│   ├── Customers.tsx    # Customer management
│   ├── Inventory.tsx    # Inventory (Phase 2)
│   ├── Vendors.tsx      # Vendor management (Phase 2)
│   ├── Expenses.tsx     # Expense tracking (Phase 2)
│   ├── Reports.tsx      # Reports (Phase 3)
│   ├── Settings.tsx     # Application settings
│   └── Login.tsx        # Authentication
├── contexts/            # React Context
│   ├── AuthContext.tsx  # Authentication state
│   └── store.ts         # Global state management
├── layouts/             # Layout components
│   └── DashboardLayout.tsx
├── services/            # API services
│   └── api.ts           # API client
├── hooks/               # Custom React hooks
├── mock-data/           # Development data
└── index.css            # Global styles
```

## Workflow

1. **Login** - Staff logs in with credentials
2. **Dashboard** - View real-time business metrics
3. **Create Bill** - Enter customer and printing services
4. **Auto Calculate** - System calculates totals automatically
5. **Print/Save** - Output bill as PDF or save to system
6. **Auto Update** - Customer records and sales data update
7. **Inventory Sync** - Stock levels update (Phase 2)
8. **Report Generation** - Automated reporting (Phase 3)

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Demo Credentials
- **Username**: superadmin
- **Password**: admin123

### Development

The application runs on `http://localhost:5000` by default.

```bash
npm run dev      # Start dev server with HMR
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run linter
```

## Development Roadmap

### Phase 1: Basic MVP ✅
**Duration**: Completed
- Login system
- Dashboard with KPIs
- Bill creation and printing
- Customer management

### Phase 2: Inventory & Operations
**Duration**: Q2 2024
- Inventory management module
- Vendor management system
- Expense tracking and categorization

### Phase 3: Analytics & Reporting
**Duration**: Q3 2024
- Comprehensive reporting system
- Business analytics charts
- Profit analysis and insights

### Phase 4: Enterprise Features
**Duration**: Q4 2024
- Offline mode with IndexedDB
- Automatic data synchronization
- Backup and disaster recovery
- Audit logging and compliance

## Design System

### Color Palette
- **Primary**: Blue-600 (#2563eb)
- **Secondary**: Slate scale (50-950)
- **Accent**: Pink-600 (#ec4899)
- **Neutral**: Gray scale for borders and backgrounds

### Themes
- **Light Mode**: Professional clean interface (slate-50 background)
- **Dark Mode**: Modern dark interface (slate-950 background)

### Typography
- **Headings**: Bold, large font sizes for hierarchy
- **Body**: Clear, readable sans-serif font
- **Monospace**: For numbers and codes

## Performance Optimization

- **Code Splitting** - Lazy loaded routes and components
- **Tree Shaking** - Unused code elimination
- **Minification** - Optimized bundle size
- **Caching** - Efficient browser caching
- **PWA Support** - Offline-first architecture (Phase 4)

## Security Features

- **Authentication** - Secure login system
- **Session Management** - Protected user sessions
- **Data Validation** - Input validation and sanitization
- **Error Handling** - Graceful error recovery
- **Audit Logs** - Complete activity tracking (Phase 4)

## Browser Support

- Chrome/Chromium (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)

## Deployment

The application is optimized for deployment on:
- Vercel (Recommended)
- Netlify
- AWS
- Azure
- DigitalOcean
- Any Node.js hosting

## Contributing

This is a commercial product for Prime Printify. For questions or contributions, please contact the development team.

## License

Proprietary - Prime Printify

## Support

For support and questions:
- **Email**: support@primeprintify.com
- **Documentation**: See ROADMAP.md and ARCHITECTURE.md
- **Issues**: Report bugs through the issue tracker

## Changelog

### Version 1.0.0 (Current)
- Initial MVP release
- Phase 1 features complete
- Modern UI with dark/light mode
- Professional branding integration

---

**Prime Printify** - Simplifying Printing Press Management
