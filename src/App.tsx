import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useStore } from './contexts/store';
import Login from './pages/Login';
import AdminRegister from './pages/AdminRegister';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Vendors from './pages/Vendors';
import Expenses from './pages/Expenses';
import Bills from './pages/Bills';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import StaffManagement from './pages/StaffManagement';
import AccessDenied from './pages/AccessDenied';

const ADMIN_ROLES = ['admin', 'superadmin'];

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

function App() {
  const { user } = useAuth();
  const { initialize, isInitialized } = useStore();

  useEffect(() => {
    initialize(user?.role).catch(console.error);
  }, [initialize, user?.role]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading PrintPress ERP…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <AdminRegister /> : <Navigate to="/dashboard" />} />
      <Route
        path="/*"
        element={user ? <DashboardLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="billing" element={<RequireRole roles={ADMIN_ROLES}><Billing /></RequireRole>} />
        <Route path="customers" element={<RequireRole roles={ADMIN_ROLES}><Customers /></RequireRole>} />
        <Route path="inventory" element={<RequireRole roles={ADMIN_ROLES}><Inventory /></RequireRole>} />
        <Route path="vendors" element={<RequireRole roles={ADMIN_ROLES}><Vendors /></RequireRole>} />
        <Route path="expenses" element={<RequireRole roles={ADMIN_ROLES}><Expenses /></RequireRole>} />
        <Route path="bills" element={<RequireRole roles={ADMIN_ROLES}><Bills /></RequireRole>} />
        <Route path="reports" element={<RequireRole roles={ADMIN_ROLES}><Reports /></RequireRole>} />
        <Route path="settings" element={<RequireRole roles={ADMIN_ROLES}><Settings /></RequireRole>} />
        <Route path="staff" element={<RequireRole roles={ADMIN_ROLES}><StaffManagement /></RequireRole>} />
        <Route path="*" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">Page Not Found</h1></div>} />
      </Route>
    </Routes>
  );
}

export default App;
