import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DeviceVerificationModal from './DeviceVerificationModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresDeviceVerification?: boolean;
}

/**
 * ProtectedRoute component
 * Wraps routes that require authentication and optionally device verification
 *
 * Features:
 * - Redirects to login if user is not authenticated
 * - Shows device verification modal if device not verified
 * - Prevents access to protected routes until device is verified
 */
const ProtectedRoute = ({
  children,
  requiresDeviceVerification = true,
}: ProtectedRouteProps) => {
  const { user, token, deviceVerification, checkDeviceStatus } = useAuth();
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check device status when component mounts or when user changes
    const checkStatus = async () => {
      if (user && token) {
        await checkDeviceStatus();
      }
      setIsLoading(false);
    };

    checkStatus();
  }, [user, token, checkDeviceStatus]);

  // Not authenticated - redirect to login
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Still checking device status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking device status...</p>
        </div>
      </div>
    );
  }

  // Device verification is required but not yet verified
  if (requiresDeviceVerification && !deviceVerification.isVerified) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔒</div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                Device Verification Required
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Before accessing the dashboard, we need to verify that your email is connected on this device.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Why?</span> This ensures you&apos;re accessing from a trusted device where your email is properly configured for Printify integrations.
              </p>
            </div>

            <button
              onClick={() => setIsVerificationModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all hover:shadow-lg"
            >
              Verify Device Email
            </button>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
              You&apos;ll need your Gmail/email account configured on this device
            </p>
          </div>
        </div>

        <DeviceVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onVerified={() => {
            // Refresh device status after verification
            checkDeviceStatus();
          }}
        />
      </>
    );
  }

  // All checks passed - render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
