import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';

const AccessDenied = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
        <ShieldX aria-hidden="true" className="size-8" />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Access Denied</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        You do not have permission to view this page. Staff accounts are restricted
        to submitting expenses from the dashboard.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Dashboard
      </Link>
    </div>
  );
};

export default AccessDenied;
