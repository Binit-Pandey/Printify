import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Printer, Eye, EyeOff, Check, X } from 'lucide-react';

interface ValidationState {
  email: boolean;
  emailTouched: boolean;
  password: boolean;
  passwordTouched: boolean;
  confirmPassword: boolean;
  confirmPasswordTouched: boolean;
  displayName: boolean;
  displayNameTouched: boolean;
}

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [validation, setValidation] = useState<ValidationState>({
    email: false,
    emailTouched: false,
    password: false,
    passwordTouched: false,
    confirmPassword: false,
    confirmPasswordTouched: false,
    displayName: false,
    displayNameTouched: false,
  });

  const { register, isLoading, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  // Validation functions
  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePassword = (value: string) => {
    // At least 8 chars, 1 uppercase, 1 number
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(value);
  };

  const validateConfirmPassword = (pwd: string, confirm: string) => {
    return pwd === confirm && pwd.length > 0;
  };

  const validateDisplayName = (value: string) => {
    return value.trim().length >= 2;
  };

  // Update validation on change
  useEffect(() => {
    setValidation((prev) => ({
      ...prev,
      email: validation.emailTouched ? validateEmail(email) : false,
      password: validation.passwordTouched ? validatePassword(password) : false,
      confirmPassword: validation.confirmPasswordTouched
        ? validateConfirmPassword(password, confirmPassword)
        : false,
      displayName: validation.displayNameTouched ? validateDisplayName(displayName) : false,
    }));
  }, [email, password, confirmPassword, displayName]);

  const isFormValid =
    validateEmail(email) &&
    validatePassword(password) &&
    validateConfirmPassword(password, confirmPassword) &&
    validateDisplayName(displayName);

  const handleEmailBlur = () => {
    setValidation((prev) => ({ ...prev, emailTouched: true }));
  };

  const handlePasswordBlur = () => {
    setValidation((prev) => ({ ...prev, passwordTouched: true }));
  };

  const handleConfirmPasswordBlur = () => {
    setValidation((prev) => ({ ...prev, confirmPasswordTouched: true }));
  };

  const handleDisplayNameBlur = () => {
    setValidation((prev) => ({ ...prev, displayNameTouched: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      return;
    }

    clearError();

    const success = await register(email, password, displayName);

    if (success) {
      // Redirect to device verification page after successful registration
      navigate('/verify-device');
    }
  };

  // Helper to show validation message
  const renderValidationMessage = (
    touched: boolean,
    isValid: boolean,
    validMsg: string,
    invalidMsg: string
  ) => {
    if (!touched) return null;
    if (isValid) {
      return <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1"><Check size={14} /> {validMsg}</span>;
    }
    return <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"><X size={14} /> {invalidMsg}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-pink-50 dark:to-pink-950/20 -z-10"></div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-pink-500 rounded-lg flex items-center justify-center mb-4 shadow-lg">
            <Printer className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Create Account</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Join PrintPress ERP</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">
              Full Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={handleDisplayNameBlur}
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all ${
                validation.displayNameTouched
                  ? validation.displayName
                    ? 'border-green-500 dark:border-green-500'
                    : 'border-red-500 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
              placeholder="John Doe"
              required
            />
            {renderValidationMessage(
              validation.displayNameTouched,
              validation.displayName,
              'Name looks good',
              'Name must be at least 2 characters'
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all ${
                validation.emailTouched
                  ? validation.email
                    ? 'border-green-500 dark:border-green-500'
                    : 'border-red-500 dark:border-red-500'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
              placeholder="your.email@gmail.com"
              required
            />
            {renderValidationMessage(
              validation.emailTouched,
              validation.email,
              'Email is valid',
              'Please enter a valid email address'
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                className={`w-full px-4 py-3 pr-12 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all ${
                  validation.passwordTouched
                    ? validation.password
                      ? 'border-green-500 dark:border-green-500'
                      : 'border-red-500 dark:border-red-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
                placeholder="Create a strong password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {renderValidationMessage(
              validation.passwordTouched,
              validation.password,
              'Password is strong',
              'Password must be 8+ chars with uppercase and number'
            )}
            {validation.passwordTouched && !validation.password && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p>Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One uppercase letter (A-Z)
                  </li>
                  <li className={/\d/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One number (0-9)
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={handleConfirmPasswordBlur}
                className={`w-full px-4 py-3 pr-12 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all ${
                  validation.confirmPasswordTouched
                    ? validation.confirmPassword
                      ? 'border-green-500 dark:border-green-500'
                      : 'border-red-500 dark:border-red-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
                placeholder="Re-enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {renderValidationMessage(
              validation.confirmPasswordTouched,
              validation.confirmPassword,
              'Passwords match',
              'Passwords do not match'
            )}
          </div>

          {/* Error Message */}
          {authError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">{authError}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 mt-6 ${
              isFormValid && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
