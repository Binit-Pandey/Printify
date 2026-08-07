import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="no-print shrink-0">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="no-print">
          <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(219,234,254,0.42),transparent_34%)] p-4 sm:p-6 lg:p-8 dark:bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.16),transparent_34%)]">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
