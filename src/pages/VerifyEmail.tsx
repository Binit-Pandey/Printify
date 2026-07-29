import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, isLoading, error } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyTokenFromUrl = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setVerificationStatus('error');
        setMessage('No verification token found in URL');
        return;
      }

      const result = await verifyEmail(token);
      if (result.success) {
        setVerificationStatus('success');
        setMessage('Email verified successfully!');
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setVerificationStatus('error');
        setMessage(result.message || 'Email verification failed');
      }
    };

    verifyTokenFromUrl();
  }, [searchParams, verifyEmail, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-pink-50 dark:to-pink-950/20 -z-10"></div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col items-center gap-4">
          {verificationStatus === 'loading' && (
            <>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Loader className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Verifying Email...</h1>
              <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
                Please wait while we verify your email address
              </p>
            </>
          )}

          {verificationStatus === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Email Verified!</h1>
              <p className="text-slate-600 dark:text-slate-400 text-center">{message}</p>
              <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Redirecting to sign in page...
              </div>
            </>
          )}

          {verificationStatus === 'error' && (
            <>
              <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-pink-600 dark:text-pink-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Verification Failed</h1>
              <p className="text-slate-600 dark:text-slate-400 text-center text-sm">{message || error}</p>
              
              <div className="mt-6 w-full">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 mb-2"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-50 py-3 rounded-lg font-semibold transition-all duration-200"
                >
                  Go to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
