import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LockKeyhole, KeyRound, Mail, Printer, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resetPassword({ email, code, newPassword });
      setMessage(res.message);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-950 dark:text-slate-50">
      <section className="relative hidden overflow-hidden bg-blue-700 px-12 py-14 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full border-[40px] border-blue-500/40" />
        <div className="absolute -bottom-32 -left-28 size-96 rounded-full border-[56px] border-blue-800/50" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><Printer aria-hidden="true" className="size-6" /></div>
          <span className="text-lg font-bold tracking-tight">PrintPress ERP</span>
        </div>
        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-blue-100">Account recovery</p>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-[-0.04em]">Choose a new password.</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-blue-100">Enter the code we emailed you along with your new password.</p>
          <div className="mt-10 flex items-center gap-3 text-sm font-semibold text-blue-50"><ShieldCheck aria-hidden="true" className="size-5" /> Your sessions will be signed out for security</div>
        </div>
        <p className="relative z-10 text-sm text-blue-100">Commercial printing management, made practical.</p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Printer aria-hidden="true" className="size-6" /></div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">PrintPress ERP</p>
          </div>
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400">Account recovery</p>
            <h2 className="text-3xl font-bold tracking-tight">Reset your password</h2>
            <p className="mt-3 leading-6 text-slate-500 dark:text-slate-400">Use the code you received by email to set a new password.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold">Email</label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-900" placeholder="you@company.com" required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="code" className="text-sm font-semibold">Reset code</label>
              <div className="relative">
                <KeyRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-900" placeholder="Enter the 4-digit code" required />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="newPassword" className="text-sm font-semibold">New password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-900" placeholder="Min 6 characters" required minLength={6} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm new password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-900" placeholder="Re-enter your password" required minLength={6} />
              </div>
            </div>

            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
            {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 aria-hidden="true" className="size-4" />{message}</div>}

            <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <><span className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Resetting...</> : 'Reset password'}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">Need a new code? <Link to="/forgot-password" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Request one</Link></p>
          </div>

          <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft aria-hidden="true" className="size-4" /> Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;
