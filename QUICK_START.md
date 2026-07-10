# Printing System - Quick Start Guide

## 🚀 Installation (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/Binit-Pandey/Printing-System.git
cd printing-system

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will open at `http://localhost:5000`

## 🔐 Login Credentials

Use any of these demo accounts:

| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | admin123 |
| Admin | admin | admin123 |
| Staff | staff | admin123 |

## 📋 Main Features

### Dashboard
- Real-time business metrics
- Weekly sales chart
- Top services overview
- Quick statistics

### Billing
- Create new bills
- Add multiple items
- Automatic VAT calculation
- Preview and print

### Customers
- Add/Edit/Delete customers
- Track customer information
- Search functionality

### Inventory
- Track stock levels
- Low-stock alerts
- Category management
- Vendor association

### Vendors
- Manage suppliers
- Track outstanding balances
- Contact information

### Expenses
- Record daily expenses
- Category-based tracking
- Monthly summaries

### Bills History
- View all bills
- Filter by status (Paid/Pending)
- Mark bills as paid
- Download PDF

### Reports
- Revenue trends
- Daily sales tracking
- Top services analysis
- Expense breakdown
- Inventory valuation

### Settings
- Company information
- Tax configuration
- Data management

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Run Linter
```bash
npm run lint
```

## 📁 Project Structure

```
src/
├── pages/          # 10 feature pages
├── components/     # Reusable UI components
├── contexts/       # Global state (Zustand)
├── hooks/          # Custom hooks
├── types/          # TypeScript interfaces
├── utils/          # Utilities & helpers
├── mock-data/      # Sample data
└── App.tsx         # Main app component
```

## 💾 Data Storage

All data is stored in browser's **localStorage**. Data persists across sessions automatically.

To clear all data:
1. Go to Settings page
2. Click "Clear All Data" button
3. Confirm the action

## 🌐 Browser Support

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## 📱 Responsive Design

The app works on:
- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

## 🎨 Dark Mode

Dark mode is fully supported. Toggle via system preferences or app settings.

## 📊 Key Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Recharts** - Charts & graphs
- **jsPDF** - PDF generation
- **Zod** - Form validation

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload dist/ folder
```

### Docker
```bash
docker build -t printing-system .
docker run -p 5000:5000 printing-system
```

## 🐛 Common Issues

### Data not saving?
- Check browser localStorage (DevTools → Application → Local Storage)
- Ensure cookies are enabled

### Build fails?
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Port 5000 already in use?
```bash
# Use a different port
npm run dev -- --port 3000
```

## 📚 Documentation

- **Full Guide**: See `DEVELOPMENT.md`
- **Project Summary**: See `PROJECT_SUMMARY.md`
- **Types**: See `src/types/index.ts`
- **Validation**: See `src/utils/validationSchemas.ts`

## 🎯 Next Steps

1. **Explore the app** - Try all features with demo data
2. **Read documentation** - Check `DEVELOPMENT.md` for detailed info
3. **Customize** - Update company info in Settings
4. **Deploy** - Follow deployment options above
5. **Integrate backend** - See backend integration guide in `DEVELOPMENT.md`

## 📞 Support

For issues or questions:
1. Check the troubleshooting section in `DEVELOPMENT.md`
2. Review the code comments
3. Check browser console for errors

## ✨ Features Checklist

- ✅ Authentication & Authorization
- ✅ Dashboard with real-time metrics
- ✅ Billing system with VAT
- ✅ Customer management
- ✅ Inventory tracking
- ✅ Vendor management
- ✅ Expense tracking
- ✅ Bill history & management
- ✅ Reports & analytics
- ✅ Settings & configuration
- ✅ PDF generation
- ✅ Form validation
- ✅ Dark mode support
- ✅ Responsive design
- ✅ localStorage persistence

---

**Version**: 1.0.0 | **Status**: Production Ready 🎉
