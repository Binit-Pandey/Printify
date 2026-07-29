import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Clock, Copy, Check } from 'lucide-react';

const EmailVerificationPending = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resendVerification, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    const state = location.state as { email?: string } | null;
    if (state?.email) {
      setEmail(state.email);
    } else {
      // Redirect if no email is provided
      navigate('/register');
    }
  }, [location, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendCount > 0) {
      setCanResend(true);
    }
  }, [countdown, resendCount]);

  const handleResendEmail = async () => {
    setResendMessage('');
    setResendError('');

    if (!canResend) return;

    const result = await resendVerification(email);
    if (result.success) {
      setResendMessage('Verification email sent! Check your inbox.');
      setResendCount(prev => prev + 1);
      setCanResend(false);
      setCountdown(60); // 1 minute cooldown
    } else {
      setResendError(result.message || 'Failed to resend verification email');
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskEmail = (emailStr: string) => {
    const [name, domain] = emailStr.split('@');
    return `${name.substring(0, 2)}${'*'.repeat(Math.max(0, name.length - 2))}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-pink-50 dark:to-pink-950/20 -z-10"></div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Check Your Email</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-center">We&apos;ve sent a verification link to your email address</p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Sent to:</span>
            <button
              onClick={handleCopyEmail}
              className="flex items-center gap-1 text-slate-900 dark:text-slate-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Copy email"
            >
              {email && <span className="text-sm font-semibold">{maskEmail(email)}</span>}
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p className="font-medium mb-1">Didn&apos;t receive the email?</p>
                <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                  <li>✓ Check your spam or junk folder</li>
                  <li>✓ Verification link expires in 24 hours</li>
                  <li>✓ You can request a new link below</li>
                </ul>
              </div>
            </div>
          </div>

          {resendMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">{resendMessage}</p>
            </div>
          )}

          {(resendError || error) && (
            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-3">
              <p className="text-sm font-medium text-pink-600 dark:text-pink-400">{resendError || error}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleResendEmail}
          disabled={!canResend || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200"
        >
          {isLoading ? 'Sending...' : canResend ? 'Resend Verification Email' : `Resend in ${countdown}s`}
        </button>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>Resend attempts: {resendCount}/3 per hour</p>
        </div>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6">
          <p>
            Already verified?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Go to Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPending;
