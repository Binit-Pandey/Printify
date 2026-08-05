import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

const AdminRegister = () => {
  const navigate = useNavigate();
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.auth.registerAdmin({ companyName, fullName, email, password, confirmPassword });
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <OtpScreen
        email={email}
        registrationData={{ companyName, fullName, password }}
        onBack={() => setStep('form')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-pink-50 dark:to-pink-950/20 -z-10"></div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center mb-6">
          <Link to="/login" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mr-3">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Register as Admin</h2>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
              placeholder="Your company name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Admin Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
              placeholder="admin@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
              placeholder="Repeat password"
              required
            />
          </div>

          {error && <p className="text-pink-600 dark:text-pink-400 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
          >
            {loading ? 'Sending verification code...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

function OtpScreen({ email, registrationData, onBack }: {
  email: string;
  registrationData: { companyName: string; fullName: string; password: string };
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 3) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otp = code.join('');
    if (otp.length !== 4) {
      setError('Please enter the 4-digit code');
      return;
    }

    setLoading(true);
    try {
      await api.auth.verifyOtp(email, otp);
      const res = await api.auth.completeRegistration({ ...registrationData, email });
      localStorage.setItem('printpress_user', JSON.stringify(res.user));
      localStorage.setItem('printpress_token', res.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCount >= 3) return;
    setResendDisabled(true);
    try {
      await api.auth.resendOtp(email);
      setResendCount(prev => prev + 1);
      setTimeout(() => setResendDisabled(false), 30000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
      setResendDisabled(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-pink-50 dark:to-pink-950/20 -z-10"></div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Printer className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Verify Email</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Enter the 4-digit code sent to<br />
            <span className="font-semibold text-slate-900 dark:text-slate-50">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-3">
            {code.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-14 h-14 text-center text-2xl font-bold border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
              />
            ))}
          </div>

          {error && <p className="text-pink-600 dark:text-pink-400 text-sm font-medium text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
          >
            {loading ? 'Verifying...' : 'Verify & Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendDisabled || resendCount >= 3}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
          >
            Resend Code {resendCount > 0 && `(${resendCount}/3)`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminRegister;