import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
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

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route 
        path="/*" 
        element={user ? <DashboardLayout /> : <Navigate to="/login" />} 
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
