import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader, Monitor, RefreshCw, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getVerificationToken, getDeviceName } from '../utils/deviceStorage';

interface DeviceVerificationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onVerified?: () => void;
}

const DeviceVerificationModal = ({
  isOpen,
  onClose,
  onVerified,
}: DeviceVerificationModalProps) => {
  const {
    user,
    initiateDeviceVerification,
    verifyDeviceEmail,
    isVerifying,
    verificationError,
    clearVerificationError,
  } = useAuth();

  const [step, setStep] = useState<'prompt' | 'verifying' | 'success' | 'error'>('prompt');
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('prompt');
      const name = getDeviceName();
      setDeviceName(name);
    }
  }, [isOpen]);

  const handleInitiateVerification = async () => {
    setStep('verifying');
    clearVerificationError();
    const success = await initiateDeviceVerification();
    if (!success) {
      setStep('error');
      return;
    }
    // Proceed to verification (token will be stored)
    await handleVerifyDevice();
  };

  const handleVerifyDevice = async () => {
    const token = getVerificationToken();
    if (!token) {
      setStep('error');
      return;
    }

    const success = await verifyDeviceEmail(token, 'browser-profile');
    if (success) {
      setStep('success');
      setTimeout(() => {
        onVerified?.();
        onClose?.();
      }, 1500);
    } else {
      setStep('error');
    }
  };

  const handleRetry = () => {
    clearVerificationError();
    handleInitiateVerification();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Monitor size={24} />
            Verify Your Device
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  For your security, we need to verify that your email{' '}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {user?.email}
                  </span>{' '}
                  is configured on this device.
                </p>
              </div>

              {deviceName && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm">
                  <p className="text-slate-600 dark:text-slate-400">
                    Device: <span className="font-medium text-slate-900 dark:text-slate-100">{deviceName}</span>
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full text-left text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 mb-4"
              >
                <HelpCircle size={16} />
                Why do we need this?
              </button>

              {showInstructions && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 space-y-2 border border-slate-200 dark:border-slate-700">
                  <p className="font-medium">Security & Privacy:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Prevents unauthorized access from unknown devices</li>
                    <li>Ensures your email account is properly configured</li>
                    <li>Protects your Printify integration settings</li>
                    <li>Complies with email provider requirements</li>
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleInitiateVerification}
                  disabled={isVerifying}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isVerifying
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                  }`}
                >
                  {isVerifying ? 'Verifying...' : 'Verify Device Email'}
                </button>

                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-full py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Not Now
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader size={48} className="text-blue-600 animate-spin" />
              <p className="text-center font-medium text-slate-900 dark:text-slate-100">
                Verifying your device...
              </p>
              <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                This usually takes a few seconds
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-3">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">
                  Device Verified!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your device is now verified. You can access the dashboard.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Verification Failed
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {verificationError ||
                      'Could not verify your device. Please ensure your email is configured on this device and try again.'}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-900 dark:text-amber-100 mb-2 font-medium">
                  Troubleshooting:
                </p>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                  <li>Check if your Gmail/email account is signed in</li>
                  <li>Clear browser cache and try again</li>
                  <li>Try a different browser or device</li>
                  <li>Ensure cookies are enabled</li>
                </ul>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  disabled={isVerifying}
                  className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    isVerifying
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                  }`}
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>

                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-full py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceVerificationModal;
