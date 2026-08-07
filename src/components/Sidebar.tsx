import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, Users, Package, Truck, Receipt, BarChart3,
  Settings, Users2, Archive, Clock, LogOut, Printer
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Billing', path: '/billing' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Truck, label: 'Vendors', path: '/vendors' },
  { icon: Receipt, label: 'Expenses', path: '/expenses' },
  { icon: FileText, label: 'Bills', path: '/bills' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: Users2, label: 'Staff Management', path: '/staff' },
  { icon: Archive, label: 'Backup', path: '/backup' },
  { icon: Clock, label: 'Audit Logs', path: '/audit' },
];

const Sidebar = ({ isOpen }: SidebarProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredMenu = menuItems.filter(item => {
    if (user?.role === 'staff') {
      return ['Dashboard', 'Billing', 'Customers', 'Inventory', 'Expenses', 'Bills', 'Reports'].includes(item.label);
    }
    if (item.label === 'Staff Management') {
      return user?.role === 'admin' || user?.role === 'superadmin';
    }
    return !['Backup', 'Audit Logs'].includes(item.label);
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 272 : 76 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      aria-label="Primary navigation"
      className="flex h-screen flex-col overflow-hidden border-r border-slate-200/80 bg-white/95 text-slate-900 shadow-[8px_0_30px_-26px_rgba(15,23,42,0.5)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-50"
    >
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-200/80 px-5 dark:border-slate-800">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <Printer aria-hidden="true" className="size-5" />
        </div>
        {isOpen && (
          <div className="min-w-0">
            <div className="truncate text-base font-bold tracking-tight">PrintPress</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">ERP workspace</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {isOpen && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Workspace</p>}
        <div className="flex flex-col gap-1">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                title={!isOpen ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200/80 p-3 dark:border-slate-800">
        <button
          onClick={logout}
          title={!isOpen ? 'Logout' : undefined}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-600 transition-colors duration-200 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/30"
          aria-label="Logout"
        >
          <LogOut aria-hidden="true" className="size-5 shrink-0" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
