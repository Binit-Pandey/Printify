import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, FileText, Users, Package, Truck, Receipt, BarChart3, 
  Settings, Users2, Archive, Clock, User 
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
  { icon: Users2, label: 'User Management', path: '/users' },
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
    return !['User Management', 'Backup', 'Audit Logs'].includes(item.label); // Hide advanced admin features for now
  });

  return (
    <motion.div 
      initial={false}
      animate={{ width: isOpen ? 280 : 80 }}
      className="h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-lg transition-all"
    >
      <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        {isOpen && <div className="font-semibold text-lg tracking-tight">PrintPress</div>}
      </div>

      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all duration-200 ${isActive 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Icon className="w-5 h-5" />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950 rounded-lg transition-all duration-200 font-medium"
          aria-label="Logout"
        >
          <User className="w-5 h-5" />
          {isOpen && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
