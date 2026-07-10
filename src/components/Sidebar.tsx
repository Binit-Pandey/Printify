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
      className="h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden"
    >
      <div className="p-6 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        {isOpen && <div className="font-semibold text-xl">PrintPress</div>}
      </div>

      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-1 transition-all ${isActive 
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              <Icon className="w-5 h-5" />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-2xl"
          aria-label="Logout"
        >
          <User className="w-5 h-5" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;
