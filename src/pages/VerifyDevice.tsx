import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Loader,
  Monitor,
  Shield,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getVerificationToken, getDeviceName, getOrCreateDeviceId } from '../utils/deviceStorage';

type VerificationStep = 'intro' | 'verifying' | 'success' | 'error' | 'help';

const VerifyDevice = () => {
  const navigate = useNavigate();
  const {
    user,
    initiateDeviceVerification,
    verifyDeviceEmail,
    isVerifying,
    verificationError,
    clearVerificationError,
    checkDeviceStatus,
  } = useAuth();

  const [step, setStep] = useState<VerificationStep>('intro');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const name = getDeviceName();
    setDeviceName(name);

    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, [user, navigate]);

  const handleStartVerification = async () => {
    setStep('verifying');
    clearVerificationError();

    // Step 1: Initiate verification
    const initiated = await initiateDeviceVerification();
    if (!initiated) {
      setStep('error');
      return;
    }

    // Step 2: Get token and verify
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief delay for UX

    const token = getVerificationToken();
    if (!token) {
      setStep('error');
      return;
    }

    const verified = await verifyDeviceEmail(token, 'browser-profile');
    if (verified) {
      setStep('success');
      // Refresh device status
      setTimeout(() => {
        checkDeviceStatus();
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }, 500);
    } else {
      setStep('error');
    }
  };

  const handleRetry = () => {
    clearVerificationError();
    handleStartVerification();
  };

  const handleHelp = () => {
    setStep(step === 'help' ? 'intro' : 'help');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 md:px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 rounded-lg p-2">
                <Monitor size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Device Verification</h1>
            </div>
            <p className="text-blue-100">Secure your PrintPress account</p>
          </div>

          {/* Content */}
          <div className="px-6 md:px-8 py-8">
            {step === 'intro' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                    Welcome, {user?.displayName}!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Before you can access the PrintPress dashboard, we need to verify that your email
                    is configured on this device.
                  </p>
                </div>

                {/* Device Info */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Email
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {user?.email}
                      </p>
                    </div>
                    {deviceName && (
                      <div>
                        <p className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Device
                        </p>
                        <p className="text-slate-700 dark:text-slate-300">{deviceName}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Why This Matters */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Shield size={20} className="text-blue-600" />
                    Why We Need This
                  </h3>
                  <div className="grid gap-3">
                    <div className="flex gap-3">
                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">Security</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Ensures only authorized access from verified devices
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">Email Verification</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Confirms your email is properly configured on this device
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          Printify Integration
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Required for email-based Printify API operations
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleStartVerification}
                    disabled={isVerifying}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      isVerifying
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Device
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleHelp}
                    className="px-4 py-3 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <HelpCircle size={18} />
                    Help
                  </button>
                </div>
              </div>
            )}

            {step === 'verifying' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader size={56} className="text-blue-600 animate-spin" />
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Verifying Your Device
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    This usually takes a few seconds...
                  </p>
                  <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                    <p>✓ Checking email configuration</p>
                    <p>✓ Validating device fingerprint</p>
                    <p>✓ Securing connection</p>
                  </div>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-4 animate-pulse">
                  <CheckCircle2 size={56} className="text-green-600" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Verification Successful!
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Your device has been verified successfully. Redirecting to dashboard...
                  </p>
                  <div className="inline-flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle2 size={18} />
                    Ready to go!
                  </div>
                </div>
              </div>
            )}

            {step === 'error' && (
              <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                  <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">
                      Verification Failed
                    </h3>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {verificationError ||
                        'We could not verify your device. Please ensure your email is configured on this device.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    What to try:
                  </h3>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                    <li className="flex gap-2">
                      <span className="font-bold">1.</span>
                      <span>Sign in to Gmail in your browser with your account</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">2.</span>
                      <span>Clear your browser cache and cookies</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">3.</span>
                      <span>Try again in a moment</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleRetry}
                  disabled={isVerifying}
                  className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    isVerifying
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      Try Again
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 'help' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    How Device Verification Works
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        What Gets Verified
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">
                        We check if your email account is configured on this browser/device using browser
                        APIs and email configuration detection.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        Your Privacy
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">
                        We do not access your email content. We only verify that email account credentials
                        are configured on this device.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          3
                        </span>
                        Why It Matters
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">
                        Device verification ensures that Printify integrations work correctly and adds an
                        extra layer of security to your account.
                      </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <span className="font-semibold">Note:</span> Each device must be verified separately.
                        This prevents unauthorized access from unknown devices.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('intro')}
                    className="flex-1 py-3 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStartVerification}
                    disabled={isVerifying}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                      isVerifying
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                    }`}
                  >
                    {isVerifying ? 'Verifying...' : 'Start Verification'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400">
          <p>PrintPress ERP • Device Verification System v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyDevice;
