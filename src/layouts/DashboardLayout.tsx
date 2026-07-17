import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className="no-print"><Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} /></div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="no-print"><Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} /></div>
        
        <main className="flex-1 overflow-auto p-8 bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
