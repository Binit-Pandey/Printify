import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useStore } from './contexts/store';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyDevice from './pages/VerifyDevice';
import ProtectedRoute from './components/ProtectedRoute';
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

function App() {
  const { user } = useAuth();
  const { initialize, isInitialized } = useStore();

  useEffect(() => {
    initialize().catch(console.error);
  }, [initialize]);

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
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      <Route
        path="/verify-device"
        element={
          user ? <VerifyDevice /> : <Navigate to="/login" />
        }
      />
      <Route
        path="/*"
        element={
          user ? (
            <ProtectedRoute requiresDeviceVerification={true}>
              <DashboardLayout />
            </ProtectedRoute>
          ) : (
            <Navigate to="/login" />
          )
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="billing" element={<Billing />} />
        <Route path="customers" element={<Customers />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="bills" element={<Bills />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">Page Not Found</h1></div>} />
      </Route>
    </Routes>
  );
}

export default App;
