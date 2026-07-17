import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Bell, Sun, Moon } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <nav className="h-16 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" aria-label="Toggle sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="font-medium text-lg">Welcome back, <span className="text-blue-600 dark:text-blue-400">{user?.name.split(' ')[0]}</span></div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all ml-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-pink-500 rounded-lg flex items-center justify-center text-sm font-medium text-white shadow-md">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 capitalize">{user?.role}</div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                <div className="font-medium">{user?.name}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950 transition-all font-medium text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
