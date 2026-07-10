# Printing System - Development Guide

## Project Overview

The Printing System is a comprehensive ERP (Enterprise Resource Planning) solution built with React, TypeScript, and Tailwind CSS. It's designed specifically for printing press businesses to manage billing, inventory, customers, vendors, expenses, and generate detailed reports.

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand with localStorage persistence
- **Forms & Validation**: React Hook Form + Zod
- **Charts**: Recharts
- **PDF Generation**: jsPDF + html2canvas
- **Routing**: React Router v7
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── ui/
│       └── Card.tsx
├── contexts/           # Global state & auth
│   ├── AuthContext.tsx
│   └── store.ts        # Zustand store (main state)
├── hooks/              # Custom React hooks
│   └── useFilter.ts
├── layouts/            # Page layouts
│   └── DashboardLayout.tsx
├── pages/              # Feature pages
│   ├── Dashboard.tsx
│   ├── Billing.tsx
│   ├── Customers.tsx
│   ├── Inventory.tsx
│   ├── Vendors.tsx
│   ├── Expenses.tsx
│   ├── Bills.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx
│   └── Login.tsx
├── types/              # TypeScript interfaces
│   └── index.ts
├── utils/              # Utility functions
│   ├── pdfGenerator.ts
│   └── validationSchemas.ts
├── mock-data/          # Initial mock data
│   └── index.ts
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Features Implemented

### Phase 1: Foundation & Cleanup ✅
- Global state management with Zustand
- localStorage persistence
- Reusable search/filter hooks
- Refactored core pages to use global state

### Phase 2: Core Modules ✅
- **Inventory Management**: Full CRUD, stock tracking, low-stock alerts
- **Vendors/Suppliers**: Vendor management with outstanding balances
- **Expenses**: Category-based expense tracking with monthly summaries
- **Bills/Invoices**: Complete bill history with status management

### Phase 3: Advanced Features ✅
- **Reports Dashboard**: Revenue trends, daily sales, top services, expense breakdown
- **Settings Page**: Company information, tax configuration, data management
- **Role-based Navigation**: Different menu items for staff vs admin users

### Phase 4: Polish & Production Readiness ✅
- Form validation schemas (Zod)
- PDF generation utilities
- Responsive design improvements
- Build optimization

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/Binit-Pandey/Printing-System.git
cd printing-system

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5000`

### Demo Login

Use these credentials to log in:

- **Username**: `superadmin` | **Password**: `admin123`
- **Username**: `admin` | **Password**: `admin123`
- **Username**: `staff` | **Password**: `admin123`

## Development Workflow

### Adding a New Feature

1. **Create the page component** in `src/pages/`
2. **Add TypeScript types** in `src/types/index.ts`
3. **Add mock data** in `src/mock-data/index.ts`
4. **Add store actions** in `src/contexts/store.ts`
5. **Create validation schema** in `src/utils/validationSchemas.ts`
6. **Add route** in `src/App.tsx`
7. **Update sidebar** in `src/components/Sidebar.tsx`

### Form Validation Example

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema } from '../utils/validationSchemas';

const MyForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  );
};
```

### Using Global State

```typescript
import { useStore } from '../contexts/store';

const MyComponent = () => {
  const { customers, addCustomer, deleteCustomer } = useStore();
  
  // Use the store actions
};
```

### Using Search Filter Hook

```typescript
import { useFilter } from '../hooks/useFilter';

const MyList = () => {
  const { searchQuery, setSearchQuery, filteredItems } = useFilter(
    items,
    ['name', 'phone', 'email']
  );

  return (
    <>
      <input 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {filteredItems.map(item => (...))}
    </>
  );
};
```

## Build & Deployment

### Development Build

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

This creates an optimized build in the `dist/` folder with:
- Minified code (Terser)
- Removed console logs
- No source maps
- Optimized bundle size

### Preview Production Build

```bash
npm run preview
```

## Database & Backend Integration

Currently, the application uses localStorage for persistence. To integrate with a backend:

1. **Create API service** in `src/services/api.ts`
2. **Replace store actions** with API calls
3. **Add loading/error states** to components
4. **Implement authentication** with JWT tokens

Example API service structure:

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE = 'https://api.example.com';

export const customerAPI = {
  getAll: () => axios.get(`${API_BASE}/customers`),
  create: (data) => axios.post(`${API_BASE}/customers`, data),
  update: (id, data) => axios.put(`${API_BASE}/customers/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE}/customers/${id}`),
};
```

## Performance Optimization

- **Code Splitting**: Routes are automatically split by Vite
- **Memoization**: Use `useMemo` for expensive calculations
- **Lazy Loading**: Implement React.lazy() for heavy components
- **Image Optimization**: Use optimized image formats
- **Bundle Analysis**: Run `npm run build` and check dist/ size

## Testing

To add testing:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

Create test files with `.test.tsx` extension and run:

```bash
npm run test
```

## Troubleshooting

### State not persisting?
- Check browser's localStorage (DevTools → Application → Local Storage)
- Ensure Zustand persist middleware is configured correctly

### Form validation not working?
- Verify Zod schema is correctly defined
- Check that `zodResolver` is passed to `useForm`

### Charts not displaying?
- Ensure data is properly formatted for Recharts
- Check console for errors

### PDF generation issues?
- Verify jsPDF and html2canvas are installed
- Check PDF generation utility for correct formatting

## Future Enhancements

- [ ] User authentication with JWT
- [ ] Backend API integration
- [ ] Email notifications
- [ ] SMS alerts for low stock
- [ ] Advanced reporting with export to Excel
- [ ] Multi-user collaboration
- [ ] Thermal printer support
- [ ] Barcode generation
- [ ] Mobile app (React Native)
- [ ] Dark mode refinements
- [ ] Accessibility improvements (WCAG 2.1)
- [ ] Audit logging
- [ ] Role-based access control (RBAC)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.

---

**Last Updated**: July 2026
**Version**: 1.0.0
