import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Bell, Sun, Moon, Menu, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="relative z-20 flex h-20 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Toggle sidebar"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">Operations overview</div>
          <div className="truncate text-base font-bold tracking-tight sm:text-lg">Welcome back, <span className="text-blue-600 dark:text-blue-400">{user?.name.split(' ')[0]}</span></div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={toggleTheme} className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {dark ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
        </button>
        <button className="relative rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Notifications">
          <Bell aria-hidden="true" className="size-5" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
        </button>

        <div className="relative ml-1">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-expanded={showProfileMenu}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/20">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left md:block">
              <div className="max-w-28 truncate text-sm font-semibold">{user?.name}</div>
              <div className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role}</div>
            </div>
            <ChevronDown aria-hidden="true" className="hidden size-4 text-slate-400 md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900" role="menu">
              <div className="border-b border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
                <div className="truncate font-semibold">{user?.name}</div>
                <div className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                role="menuitem"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
