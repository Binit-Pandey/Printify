import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, MailCheck, Printer } from 'lucide-react';
import { api, setAuthToken } from '../services/api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-900';

const AdminRegister = () => {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.auth.registerAdmin({ companyName, fullName, email, password, confirmPassword });
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  if (step === 'otp') return <OtpScreen email={email} registrationData={{ companyName, fullName, password }} onBack={() => setStep('form')} />;

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-950 dark:text-slate-50">
      <section className="relative hidden overflow-hidden bg-slate-900 px-12 py-14 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-blue-700 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)] opacity-90" />
        <div className="relative z-10 flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-blue-600"><Printer aria-hidden="true" className="size-6" /></div><span className="font-bold">PrintPress ERP</span></div>
        <div className="relative z-10 max-w-sm"><p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-200">Start with clarity</p><h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-[-0.04em]">Build a better print operation.</h1><p className="mt-6 leading-7 text-slate-300">Set up your workspace once, then give your team the tools to do their best work every day.</p></div>
        <p className="relative z-10 text-sm text-slate-400">Designed for the way print shops work.</p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-8">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Printer aria-hidden="true" className="size-5" /></div><span className="font-bold">PrintPress ERP</span></div>
          <div className="mb-8 flex items-start gap-4"><Link to="/login" className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Back to login"><ArrowLeft aria-hidden="true" className="size-5" /></Link><div><p className="mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400">New workspace</p><h2 className="text-3xl font-bold tracking-tight">Register as admin</h2><p className="mt-2 leading-6 text-slate-500 dark:text-slate-400">Create the secure home for your print operation.</p></div></div>
          <form onSubmit={handleRegister} className="grid gap-5 sm:grid-cols-2">
            <Field label="Company name" value={companyName} onChange={setCompanyName} placeholder="Your company name" />
            <Field label="Admin full name" value={fullName} onChange={setFullName} placeholder="John Doe" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="admin@company.com" type="email" />
            <div className="flex flex-col gap-2"><label htmlFor="password" className="text-sm font-semibold">Password</label><div className="relative"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-12`} placeholder="Min 6 characters" minLength={6} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button></div></div>
            <Field label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" type="password" />
            {error && <div role="alert" className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
            <button type="submit" disabled={loading} className="sm:col-span-2 flex items-center justify-center rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><span className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Sending verification code...</> : 'Create workspace'}</button>
          </form>
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">Already have an account? <Link to="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
};

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return <div className="flex flex-col gap-2"><label htmlFor={id} className="text-sm font-semibold">{label}</label><input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder={placeholder} required /></div>;
}

function OtpScreen({ email, registrationData, onBack }: { email: string; registrationData: { companyName: string; fullName: string; password: string }; onBack: () => void }) {
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code]; newCode[index] = value; setCode(newCode);
    if (value && index < 3) document.getElementById(`otp-${index + 1}`)?.focus();
  };
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
  };
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); const otp = code.join('');
    if (otp.length !== 4) { setError('Please enter the 4-digit code'); return; }
    setLoading(true);
    try { await api.auth.verifyOtp(email, otp); const res = await api.auth.completeRegistration({ ...registrationData, email }); localStorage.setItem('printpress_user', JSON.stringify(res.user)); setAuthToken(res.token); window.location.href = '/dashboard'; }
    catch (err: any) { setError(err.message || 'Verification failed'); }
    finally { setLoading(false); }
  };
  const handleResend = async () => {
    if (resendCount >= 3) return; setResendDisabled(true);
    try { await api.auth.resendOtp(email); setResendCount(prev => prev + 1); setTimeout(() => setResendDisabled(false), 30000); }
    catch (err: any) { setError(err.message || 'Failed to resend code'); setResendDisabled(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950"><div className="w-full max-w-md"><button onClick={onBack} className="mb-8 flex items-center gap-2 rounded-lg p-1 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft aria-hidden="true" className="size-4" />Back to details</button><div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-9"><div className="mb-8 text-center"><div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><MailCheck aria-hidden="true" className="size-7" /></div><p className="mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400">Almost there</p><h2 className="text-2xl font-bold tracking-tight">Verify your email</h2><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Enter the 4-digit code sent to<br /><span className="font-semibold text-slate-900 dark:text-slate-200">{email}</span></p></div><form onSubmit={handleVerify} className="flex flex-col gap-6"><div className="flex justify-center gap-3">{code.map((digit, i) => <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleCodeChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} aria-label={`Verification digit ${i + 1}`} className="size-14 rounded-xl border border-slate-200 bg-slate-50 text-center text-2xl font-bold shadow-sm transition-colors focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900" />)}</div>{error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}<button type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-60">{loading ? 'Verifying...' : 'Verify and create account'}</button></form><div className="mt-6 text-center"><button type="button" onClick={handleResend} disabled={resendDisabled || resendCount >= 3} className="text-sm font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-blue-400">Resend code {resendCount > 0 && `(${resendCount}/3)`}</button></div></div></div></main>;
}

export default AdminRegister;
